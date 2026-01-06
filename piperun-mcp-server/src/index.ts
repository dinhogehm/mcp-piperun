#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const PIPERUN_API_BASE_URL = 'https://api.pipe.run/v1';
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// Token global (opcional - pode ser configurado via env)
const GLOBAL_API_TOKEN = process.env.PIPERUN_API_TOKEN || '';

// ============================================================================
// CLIENTE HTTP COM RETRY
// ============================================================================

const axiosInstance: AxiosInstance = axios.create({
  baseURL: PIPERUN_API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry<T>(config: AxiosRequestConfig, retries = MAX_RETRIES): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axiosInstance.request<T>(config);
      return response.data;
    } catch (error) {
      lastError = error as Error;

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        // Não fazer retry para erros de cliente (4xx) exceto 429 (rate limit)
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw error;
        }

        // Retry para erros de servidor (5xx), timeout, ou rate limit
        if (attempt < retries) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.error(
            `Tentativa ${attempt + 1} falhou. Aguardando ${delay}ms antes de tentar novamente...`
          );
          await sleep(delay);
        }
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}

// ============================================================================
// MAPEAMENTO DE ENDPOINTS
// ============================================================================

const ENDPOINT_MAP: Record<string, string> = {
  list_deals: '/deals',
  list_persons: '/persons',
  list_pipelines: '/pipelines',
  list_stages: '/stages',
  list_items: '/items',
  list_users: '/users',
  list_activities: '/activities',
  list_companies: '/companies',
  list_tags: '/tags',
  list_loss_reasons: '/loss-reasons',
  list_deal_sources: '/deal-sources',
  list_activity_types: '/activity-types',
  list_custom_fields: '/custom-fields',
  list_notes: '/notes',
};

// ============================================================================
// INTERFACES E VALIDAÇÃO
// ============================================================================

interface CreatePersonArgs {
  name: string;
  owner_id: number;
  email?: string;
  phone?: string;
  company_id?: number;
}

interface UpdatePersonArgs {
  person_id: number;
  name?: string;
  owner_id?: number;
  email?: string;
  phone?: string;
  company_id?: number;
}

interface CreateCompanyArgs {
  name: string;
  owner_id: number;
  email?: string;
  phone?: string;
}

interface UpdateCompanyArgs {
  company_id: number;
  name?: string;
  owner_id?: number;
  email?: string;
  phone?: string;
}

interface CreateDealArgs {
  title: string;
  pipeline_id: number;
  stage_id: number;
  owner_id: number;
  person_id?: number;
  company_id?: number;
  value?: number;
}

interface UpdateDealArgs {
  deal_id: number;
  title?: string;
  pipeline_id?: number;
  stage_id?: number;
  owner_id?: number;
  person_id?: number;
  company_id?: number;
  value?: number;
  status?: number;
}

interface CreateNoteArgs {
  content: string;
  deal_id?: number;
  person_id?: number;
  company_id?: number;
}

interface CreateActivityArgs {
  title: string;
  activity_type_id: number;
  owner_id: number;
  deal_id?: number;
  person_id?: number;
  company_id?: number;
  start_at?: string;
  end_at?: string;
  description?: string;
}

interface UpdateActivityArgs {
  activity_id: number;
  title?: string;
  activity_type_id?: number;
  owner_id?: number;
  status?: number;
  start_at?: string;
  end_at?: string;
  description?: string;
}

// Type guards
function isValidCreatePersonArgs(args: unknown): args is CreatePersonArgs {
  if (typeof args !== 'object' || args === null) return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.name === 'string' &&
    a.name.trim() !== '' &&
    typeof a.owner_id === 'number' &&
    (a.email === undefined || typeof a.email === 'string') &&
    (a.phone === undefined || typeof a.phone === 'string') &&
    (a.company_id === undefined || typeof a.company_id === 'number')
  );
}

function isValidUpdatePersonArgs(args: unknown): args is UpdatePersonArgs {
  if (typeof args !== 'object' || args === null) return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.person_id === 'number' &&
    (a.name === undefined || typeof a.name === 'string') &&
    (a.owner_id === undefined || typeof a.owner_id === 'number') &&
    (a.email === undefined || typeof a.email === 'string') &&
    (a.phone === undefined || typeof a.phone === 'string') &&
    (a.company_id === undefined || typeof a.company_id === 'number')
  );
}

function isValidCreateCompanyArgs(args: unknown): args is CreateCompanyArgs {
  if (typeof args !== 'object' || args === null) return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.name === 'string' &&
    a.name.trim() !== '' &&
    typeof a.owner_id === 'number' &&
    (a.email === undefined || typeof a.email === 'string') &&
    (a.phone === undefined || typeof a.phone === 'string')
  );
}

function isValidUpdateCompanyArgs(args: unknown): args is UpdateCompanyArgs {
  if (typeof args !== 'object' || args === null) return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.company_id === 'number' &&
    (a.name === undefined || typeof a.name === 'string') &&
    (a.owner_id === undefined || typeof a.owner_id === 'number') &&
    (a.email === undefined || typeof a.email === 'string') &&
    (a.phone === undefined || typeof a.phone === 'string')
  );
}

function isValidCreateDealArgs(args: unknown): args is CreateDealArgs {
  if (typeof args !== 'object' || args === null) return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.title === 'string' &&
    a.title.trim() !== '' &&
    typeof a.pipeline_id === 'number' &&
    typeof a.stage_id === 'number' &&
    typeof a.owner_id === 'number' &&
    (a.person_id === undefined || typeof a.person_id === 'number') &&
    (a.company_id === undefined || typeof a.company_id === 'number') &&
    (a.value === undefined || typeof a.value === 'number')
  );
}

function isValidUpdateDealArgs(args: unknown): args is UpdateDealArgs {
  if (typeof args !== 'object' || args === null) return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.deal_id === 'number' &&
    (a.title === undefined || typeof a.title === 'string') &&
    (a.pipeline_id === undefined || typeof a.pipeline_id === 'number') &&
    (a.stage_id === undefined || typeof a.stage_id === 'number') &&
    (a.owner_id === undefined || typeof a.owner_id === 'number') &&
    (a.person_id === undefined || typeof a.person_id === 'number') &&
    (a.company_id === undefined || typeof a.company_id === 'number') &&
    (a.value === undefined || typeof a.value === 'number') &&
    (a.status === undefined || typeof a.status === 'number')
  );
}

function isValidCreateNoteArgs(args: unknown): args is CreateNoteArgs {
  if (typeof args !== 'object' || args === null) return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.content === 'string' &&
    a.content.trim() !== '' &&
    (typeof a.deal_id === 'number' ||
      typeof a.person_id === 'number' ||
      typeof a.company_id === 'number')
  );
}

function isValidCreateActivityArgs(args: unknown): args is CreateActivityArgs {
  if (typeof args !== 'object' || args === null) return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.title === 'string' &&
    a.title.trim() !== '' &&
    typeof a.activity_type_id === 'number' &&
    typeof a.owner_id === 'number' &&
    (a.deal_id === undefined || typeof a.deal_id === 'number') &&
    (a.person_id === undefined || typeof a.person_id === 'number') &&
    (a.company_id === undefined || typeof a.company_id === 'number') &&
    (a.start_at === undefined || typeof a.start_at === 'string') &&
    (a.end_at === undefined || typeof a.end_at === 'string') &&
    (a.description === undefined || typeof a.description === 'string')
  );
}

function isValidUpdateActivityArgs(args: unknown): args is UpdateActivityArgs {
  if (typeof args !== 'object' || args === null) return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.activity_id === 'number' &&
    (a.title === undefined || typeof a.title === 'string') &&
    (a.activity_type_id === undefined || typeof a.activity_type_id === 'number') &&
    (a.owner_id === undefined || typeof a.owner_id === 'number') &&
    (a.status === undefined || typeof a.status === 'number') &&
    (a.start_at === undefined || typeof a.start_at === 'string') &&
    (a.end_at === undefined || typeof a.end_at === 'string') &&
    (a.description === undefined || typeof a.description === 'string')
  );
}

// ============================================================================
// FORMATADORES DE RESPOSTA
// ============================================================================

interface DealData {
  id: number;
  title: string;
  value?: number;
  status?: number;
  stage?: { name: string };
  pipeline?: { name: string };
  person?: { name: string };
  company?: { name: string };
  owner?: { name: string };
}

interface PersonData {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: { name: string };
  owner?: { name: string };
}

interface CompanyData {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  owner?: { name: string };
}

interface ActivityData {
  id: number;
  title: string;
  status?: number;
  activity_type?: { name: string };
  owner?: { name: string };
  start_at?: string;
  end_at?: string;
}

interface ApiResponse<T> {
  data?: T | T[];
  meta?: {
    total?: number;
    current_page?: number;
    last_page?: number;
  };
  success?: boolean;
}

function formatDealSummary(deal: DealData): string {
  const status =
    deal.status === 1
      ? 'Aberta'
      : deal.status === 2
        ? 'Ganha'
        : deal.status === 3
          ? 'Perdida'
          : 'Desconhecido';
  const value = deal.value ? `R$ ${deal.value.toLocaleString('pt-BR')}` : 'Sem valor';
  return `[${deal.id}] ${deal.title} | ${value} | ${status} | Etapa: ${deal.stage?.name || 'N/A'} | Responsável: ${deal.owner?.name || 'N/A'}`;
}

function formatPersonSummary(person: PersonData): string {
  const contact = [person.email, person.phone].filter(Boolean).join(' | ') || 'Sem contato';
  return `[${person.id}] ${person.name} | ${contact} | Empresa: ${person.company?.name || 'N/A'}`;
}

function formatCompanySummary(company: CompanyData): string {
  const contact = [company.email, company.phone].filter(Boolean).join(' | ') || 'Sem contato';
  return `[${company.id}] ${company.name} | ${contact}`;
}

function formatActivitySummary(activity: ActivityData): string {
  const status =
    activity.status === 0
      ? 'Aberta'
      : activity.status === 2
        ? 'Concluída'
        : activity.status === 4
          ? 'No Show'
          : 'Desconhecido';
  return `[${activity.id}] ${activity.title} | ${status} | Tipo: ${activity.activity_type?.name || 'N/A'} | Responsável: ${activity.owner?.name || 'N/A'}`;
}

function formatListResponse<T>(
  data: ApiResponse<T>,
  formatter: (item: T) => string,
  entityName: string
): string {
  const items = Array.isArray(data.data) ? data.data : data.data ? [data.data] : [];
  const meta = data.meta;

  if (items.length === 0) {
    return `Nenhum(a) ${entityName} encontrado(a).`;
  }

  let result = items.map(formatter).join('\n');

  if (meta?.total) {
    result += `\n\n📊 Total: ${meta.total} | Página: ${meta.current_page || 1}/${meta.last_page || 1}`;
  }

  return result;
}

// ============================================================================
// SERVIDOR MCP
// ============================================================================

const server = new Server(
  {
    name: 'piperun-mcp-server',
    version: '0.3.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler para listar ferramentas
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const simpleSchema = {
    type: 'object' as const,
    properties: {
      api_token: {
        type: 'string',
        description: 'Token da API do PipeRun (opcional se PIPERUN_API_TOKEN estiver configurado)',
      },
    },
    required: [] as string[],
  };

  const paginatedSchema = {
    type: 'object' as const,
    properties: {
      api_token: {
        type: 'string',
        description: 'Token da API do PipeRun (opcional se PIPERUN_API_TOKEN estiver configurado)',
      },
      page: { type: 'integer', description: '(Opcional) Número da página (padrão: 1)' },
      show: {
        type: 'integer',
        description: '(Opcional) Quantidade por página (padrão: 20, máx: 200)',
      },
    },
    required: [] as string[],
  };

  return {
    tools: [
      // ===== OPORTUNIDADES (DEALS) =====
      {
        name: 'list_deals',
        description: 'Lista oportunidades do PipeRun CRM. Retorna resumo formatado.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            pipeline_id: { type: 'integer', description: '(Opcional) ID do funil' },
            stage_id: { type: 'integer', description: '(Opcional) ID da etapa' },
            person_id: { type: 'integer', description: '(Opcional) ID da pessoa' },
            company_id: { type: 'integer', description: '(Opcional) ID da empresa' },
            owner_id: { type: 'integer', description: '(Opcional) ID do responsável' },
            status: { type: 'integer', description: '(Opcional) 1=Aberta, 2=Ganha, 3=Perdida' },
            page: { type: 'integer', description: '(Opcional) Página (padrão: 1)' },
            show: { type: 'integer', description: '(Opcional) Itens por página (padrão: 20)' },
          },
          required: [],
        },
      },
      {
        name: 'get_deal',
        description: 'Obtém detalhes de uma oportunidade específica.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            deal_id: { type: 'integer', description: 'ID da oportunidade' },
          },
          required: ['deal_id'],
        },
      },
      {
        name: 'create_deal',
        description: 'Cria uma nova oportunidade no PipeRun.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            title: { type: 'string', description: 'Título da oportunidade' },
            pipeline_id: { type: 'integer', description: 'ID do funil' },
            stage_id: { type: 'integer', description: 'ID da etapa inicial' },
            owner_id: { type: 'integer', description: 'ID do responsável' },
            person_id: { type: 'integer', description: '(Opcional) ID da pessoa' },
            company_id: { type: 'integer', description: '(Opcional) ID da empresa' },
            value: { type: 'number', description: '(Opcional) Valor' },
          },
          required: ['title', 'pipeline_id', 'stage_id', 'owner_id'],
        },
      },
      {
        name: 'update_deal',
        description: 'Atualiza uma oportunidade existente.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            deal_id: { type: 'integer', description: 'ID da oportunidade' },
            title: { type: 'string', description: '(Opcional) Novo título' },
            pipeline_id: { type: 'integer', description: '(Opcional) Novo funil' },
            stage_id: { type: 'integer', description: '(Opcional) Nova etapa' },
            owner_id: { type: 'integer', description: '(Opcional) Novo responsável' },
            value: { type: 'number', description: '(Opcional) Novo valor' },
            status: { type: 'integer', description: '(Opcional) 1=Aberta, 2=Ganha, 3=Perdida' },
          },
          required: ['deal_id'],
        },
      },
      {
        name: 'delete_deal',
        description: 'Exclui uma oportunidade.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            deal_id: { type: 'integer', description: 'ID da oportunidade' },
          },
          required: ['deal_id'],
        },
      },
      {
        name: 'search_deals',
        description: 'Busca oportunidades por título.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            query: { type: 'string', description: 'Termo de busca' },
            page: { type: 'integer', description: '(Opcional) Página' },
            show: { type: 'integer', description: '(Opcional) Itens por página' },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_deal_sources',
        description: 'Lista origens de oportunidades.',
        inputSchema: simpleSchema,
      },

      // ===== PESSOAS (PERSONS) =====
      {
        name: 'list_persons',
        description: 'Lista pessoas/contatos do PipeRun. Retorna resumo formatado.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            owner_id: { type: 'integer', description: '(Opcional) ID do responsável' },
            company_id: { type: 'integer', description: '(Opcional) ID da empresa' },
            page: { type: 'integer', description: '(Opcional) Página' },
            show: { type: 'integer', description: '(Opcional) Itens por página' },
          },
          required: [],
        },
      },
      {
        name: 'get_person',
        description: 'Obtém detalhes de uma pessoa específica.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            person_id: { type: 'integer', description: 'ID da pessoa' },
          },
          required: ['person_id'],
        },
      },
      {
        name: 'create_person',
        description: 'Cria uma nova pessoa/contato.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            name: { type: 'string', description: 'Nome' },
            owner_id: { type: 'integer', description: 'ID do responsável' },
            email: { type: 'string', description: '(Opcional) Email' },
            phone: { type: 'string', description: '(Opcional) Telefone' },
            company_id: { type: 'integer', description: '(Opcional) ID da empresa' },
          },
          required: ['name', 'owner_id'],
        },
      },
      {
        name: 'update_person',
        description: 'Atualiza uma pessoa existente.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            person_id: { type: 'integer', description: 'ID da pessoa' },
            name: { type: 'string', description: '(Opcional) Novo nome' },
            owner_id: { type: 'integer', description: '(Opcional) Novo responsável' },
            email: { type: 'string', description: '(Opcional) Novo email' },
            phone: { type: 'string', description: '(Opcional) Novo telefone' },
            company_id: { type: 'integer', description: '(Opcional) Nova empresa' },
          },
          required: ['person_id'],
        },
      },
      {
        name: 'delete_person',
        description: 'Exclui uma pessoa.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            person_id: { type: 'integer', description: 'ID da pessoa' },
          },
          required: ['person_id'],
        },
      },
      {
        name: 'search_persons',
        description: 'Busca pessoas por nome ou email.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            query: { type: 'string', description: 'Termo de busca (nome ou email)' },
            page: { type: 'integer', description: '(Opcional) Página' },
            show: { type: 'integer', description: '(Opcional) Itens por página' },
          },
          required: ['query'],
        },
      },

      // ===== EMPRESAS (COMPANIES) =====
      { name: 'list_companies', description: 'Lista empresas.', inputSchema: paginatedSchema },
      {
        name: 'get_company',
        description: 'Obtém detalhes de uma empresa.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            company_id: { type: 'integer', description: 'ID da empresa' },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'create_company',
        description: 'Cria uma nova empresa.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            name: { type: 'string', description: 'Nome' },
            owner_id: { type: 'integer', description: 'ID do responsável' },
            email: { type: 'string', description: '(Opcional) Email' },
            phone: { type: 'string', description: '(Opcional) Telefone' },
          },
          required: ['name', 'owner_id'],
        },
      },
      {
        name: 'update_company',
        description: 'Atualiza uma empresa.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            company_id: { type: 'integer', description: 'ID da empresa' },
            name: { type: 'string', description: '(Opcional) Novo nome' },
            owner_id: { type: 'integer', description: '(Opcional) Novo responsável' },
            email: { type: 'string', description: '(Opcional) Novo email' },
            phone: { type: 'string', description: '(Opcional) Novo telefone' },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'delete_company',
        description: 'Exclui uma empresa.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            company_id: { type: 'integer', description: 'ID da empresa' },
          },
          required: ['company_id'],
        },
      },

      // ===== ATIVIDADES =====
      {
        name: 'list_activities',
        description: 'Lista atividades.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            deal_id: { type: 'integer', description: '(Opcional) ID da oportunidade' },
            owner_id: { type: 'integer', description: '(Opcional) ID do responsável' },
            activity_type_id: { type: 'integer', description: '(Opcional) ID do tipo' },
            status: { type: 'integer', description: '(Opcional) 0=Aberta, 2=Concluída, 4=No Show' },
            page: { type: 'integer', description: '(Opcional) Página' },
            show: { type: 'integer', description: '(Opcional) Itens por página' },
          },
          required: [],
        },
      },
      {
        name: 'get_activity',
        description: 'Obtém detalhes de uma atividade.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            activity_id: { type: 'integer', description: 'ID da atividade' },
          },
          required: ['activity_id'],
        },
      },
      {
        name: 'create_activity',
        description: 'Cria uma nova atividade.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            title: { type: 'string', description: 'Título' },
            activity_type_id: { type: 'integer', description: 'ID do tipo de atividade' },
            owner_id: { type: 'integer', description: 'ID do responsável' },
            deal_id: { type: 'integer', description: '(Opcional) ID da oportunidade' },
            person_id: { type: 'integer', description: '(Opcional) ID da pessoa' },
            company_id: { type: 'integer', description: '(Opcional) ID da empresa' },
            start_at: { type: 'string', description: '(Opcional) Data/hora início (ISO 8601)' },
            end_at: { type: 'string', description: '(Opcional) Data/hora fim (ISO 8601)' },
            description: { type: 'string', description: '(Opcional) Descrição' },
          },
          required: ['title', 'activity_type_id', 'owner_id'],
        },
      },
      {
        name: 'update_activity',
        description: 'Atualiza uma atividade.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            activity_id: { type: 'integer', description: 'ID da atividade' },
            title: { type: 'string', description: '(Opcional) Novo título' },
            activity_type_id: { type: 'integer', description: '(Opcional) Novo tipo' },
            owner_id: { type: 'integer', description: '(Opcional) Novo responsável' },
            status: { type: 'integer', description: '(Opcional) 0=Aberta, 2=Concluída, 4=No Show' },
            start_at: { type: 'string', description: '(Opcional) Nova data/hora início' },
            end_at: { type: 'string', description: '(Opcional) Nova data/hora fim' },
            description: { type: 'string', description: '(Opcional) Nova descrição' },
          },
          required: ['activity_id'],
        },
      },
      {
        name: 'delete_activity',
        description: 'Exclui uma atividade.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            activity_id: { type: 'integer', description: 'ID da atividade' },
          },
          required: ['activity_id'],
        },
      },
      {
        name: 'list_activity_types',
        description: 'Lista tipos de atividades.',
        inputSchema: simpleSchema,
      },

      // ===== NOTAS =====
      {
        name: 'list_notes',
        description: 'Lista notas.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            deal_id: { type: 'integer', description: '(Opcional) ID da oportunidade' },
            person_id: { type: 'integer', description: '(Opcional) ID da pessoa' },
            company_id: { type: 'integer', description: '(Opcional) ID da empresa' },
            page: { type: 'integer', description: '(Opcional) Página' },
            show: { type: 'integer', description: '(Opcional) Itens por página' },
          },
          required: [],
        },
      },
      {
        name: 'create_note',
        description: 'Cria uma nota associada a deal, pessoa ou empresa.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            content: { type: 'string', description: 'Conteúdo da nota' },
            deal_id: { type: 'integer', description: '(Opcional) ID da oportunidade' },
            person_id: { type: 'integer', description: '(Opcional) ID da pessoa' },
            company_id: { type: 'integer', description: '(Opcional) ID da empresa' },
          },
          required: ['content'],
        },
      },
      {
        name: 'delete_note',
        description: 'Exclui uma nota.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            note_id: { type: 'integer', description: 'ID da nota' },
          },
          required: ['note_id'],
        },
      },

      // ===== FUNIS E ETAPAS =====
      { name: 'list_pipelines', description: 'Lista funis.', inputSchema: paginatedSchema },
      {
        name: 'list_stages',
        description: 'Lista etapas de funil.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token: {
              type: 'string',
              description: 'Token da API (opcional se PIPERUN_API_TOKEN configurado)',
            },
            pipeline_id: { type: 'integer', description: '(Opcional) ID do funil para filtrar' },
            page: { type: 'integer', description: '(Opcional) Página' },
            show: { type: 'integer', description: '(Opcional) Itens por página' },
          },
          required: [],
        },
      },

      // ===== OUTROS =====
      { name: 'list_items', description: 'Lista produtos.', inputSchema: paginatedSchema },
      {
        name: 'list_users',
        description: 'Lista usuários/vendedores.',
        inputSchema: paginatedSchema,
      },
      {
        name: 'list_custom_fields',
        description: 'Lista campos customizados.',
        inputSchema: simpleSchema,
      },
      { name: 'list_tags', description: 'Lista tags.', inputSchema: simpleSchema },
      {
        name: 'list_loss_reasons',
        description: 'Lista motivos de perda.',
        inputSchema: simpleSchema,
      },
    ],
  };
});

// Handler para executar ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const name = request.params.name;

  try {
    const args = request.params.arguments || {};

    // Obter token (prioridade: argumento > env)
    const api_token =
      typeof args.api_token === 'string' && args.api_token.trim()
        ? args.api_token
        : GLOBAL_API_TOKEN;

    if (!api_token) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Token não fornecido. Configure PIPERUN_API_TOKEN ou passe api_token como argumento.'
      );
    }

    // Remover token dos argumentos
    const toolArgs = { ...args } as Record<string, unknown>;
    delete toolArgs.api_token;

    // Headers
    const headers = {
      token: api_token,
      'Content-Type': 'application/json',
    };

    // Ferramentas de listagem genérica
    if (ENDPOINT_MAP[name]) {
      const data = await requestWithRetry<ApiResponse<unknown>>({
        method: 'GET',
        url: ENDPOINT_MAP[name],
        params: toolArgs,
        headers,
      });

      // Formatar resposta baseado no tipo
      if (name === 'list_deals') {
        return {
          content: [
            {
              type: 'text',
              text: formatListResponse(
                data as ApiResponse<DealData>,
                formatDealSummary,
                'oportunidade'
              ),
            },
          ],
        };
      } else if (name === 'list_persons') {
        return {
          content: [
            {
              type: 'text',
              text: formatListResponse(
                data as ApiResponse<PersonData>,
                formatPersonSummary,
                'pessoa'
              ),
            },
          ],
        };
      } else if (name === 'list_companies') {
        return {
          content: [
            {
              type: 'text',
              text: formatListResponse(
                data as ApiResponse<CompanyData>,
                formatCompanySummary,
                'empresa'
              ),
            },
          ],
        };
      } else if (name === 'list_activities') {
        return {
          content: [
            {
              type: 'text',
              text: formatListResponse(
                data as ApiResponse<ActivityData>,
                formatActivitySummary,
                'atividade'
              ),
            },
          ],
        };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    // Ferramentas específicas
    switch (name) {
      // ===== DEALS =====
      case 'get_deal': {
        if (typeof toolArgs.deal_id !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, "'deal_id' é obrigatório.");
        }
        const data = await requestWithRetry<ApiResponse<DealData>>({
          method: 'GET',
          url: `/deals/${toolArgs.deal_id}`,
          headers,
        });
        const deal = data.data as DealData;
        return {
          content: [
            {
              type: 'text',
              text: `Oportunidade encontrada:\n${formatDealSummary(deal)}\n\nDetalhes completos:\n${JSON.stringify(deal, null, 2)}`,
            },
          ],
        };
      }

      case 'create_deal': {
        if (!isValidCreateDealArgs(toolArgs)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "'title', 'pipeline_id', 'stage_id' e 'owner_id' são obrigatórios."
          );
        }
        const data = await requestWithRetry<ApiResponse<DealData>>({
          method: 'POST',
          url: '/deals',
          data: toolArgs,
          headers,
        });
        const deal = data.data as DealData;
        return {
          content: [
            {
              type: 'text',
              text: `✅ Oportunidade criada com sucesso!\n${formatDealSummary(deal)}`,
            },
          ],
        };
      }

      case 'update_deal': {
        if (!isValidUpdateDealArgs(toolArgs)) {
          throw new McpError(ErrorCode.InvalidParams, "'deal_id' é obrigatório.");
        }
        const { deal_id, ...updateData } = toolArgs;
        if (Object.keys(updateData).length === 0) {
          throw new McpError(ErrorCode.InvalidParams, 'Nenhum dado para atualizar.');
        }
        const data = await requestWithRetry<ApiResponse<DealData>>({
          method: 'PUT',
          url: `/deals/${deal_id}`,
          data: updateData,
          headers,
        });
        const deal = data.data as DealData;
        return {
          content: [
            { type: 'text', text: `✅ Oportunidade atualizada!\n${formatDealSummary(deal)}` },
          ],
        };
      }

      case 'delete_deal': {
        if (typeof toolArgs.deal_id !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, "'deal_id' é obrigatório.");
        }
        await requestWithRetry({
          method: 'DELETE',
          url: `/deals/${toolArgs.deal_id}`,
          headers,
        });
        return {
          content: [
            { type: 'text', text: `✅ Oportunidade ${toolArgs.deal_id} excluída com sucesso.` },
          ],
        };
      }

      case 'search_deals': {
        if (typeof toolArgs.query !== 'string' || !toolArgs.query.trim()) {
          throw new McpError(ErrorCode.InvalidParams, "'query' é obrigatório.");
        }
        const data = await requestWithRetry<ApiResponse<DealData>>({
          method: 'GET',
          url: '/deals',
          params: { title: toolArgs.query, page: toolArgs.page, show: toolArgs.show },
          headers,
        });
        return {
          content: [
            {
              type: 'text',
              text: `🔍 Busca por "${toolArgs.query}":\n\n${formatListResponse(data, formatDealSummary, 'oportunidade')}`,
            },
          ],
        };
      }

      // ===== PERSONS =====
      case 'get_person': {
        if (typeof toolArgs.person_id !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, "'person_id' é obrigatório.");
        }
        const data = await requestWithRetry<ApiResponse<PersonData>>({
          method: 'GET',
          url: `/persons/${toolArgs.person_id}`,
          headers,
        });
        const person = data.data as PersonData;
        return {
          content: [
            {
              type: 'text',
              text: `Pessoa encontrada:\n${formatPersonSummary(person)}\n\nDetalhes:\n${JSON.stringify(person, null, 2)}`,
            },
          ],
        };
      }

      case 'create_person': {
        if (!isValidCreatePersonArgs(toolArgs)) {
          throw new McpError(ErrorCode.InvalidParams, "'name' e 'owner_id' são obrigatórios.");
        }
        const data = await requestWithRetry<ApiResponse<PersonData>>({
          method: 'POST',
          url: '/persons',
          data: toolArgs,
          headers,
        });
        const person = data.data as PersonData;
        return {
          content: [{ type: 'text', text: `✅ Pessoa criada!\n${formatPersonSummary(person)}` }],
        };
      }

      case 'update_person': {
        if (!isValidUpdatePersonArgs(toolArgs)) {
          throw new McpError(ErrorCode.InvalidParams, "'person_id' é obrigatório.");
        }
        const { person_id, ...updateData } = toolArgs;
        if (Object.keys(updateData).length === 0) {
          throw new McpError(ErrorCode.InvalidParams, 'Nenhum dado para atualizar.');
        }
        const data = await requestWithRetry<ApiResponse<PersonData>>({
          method: 'PUT',
          url: `/persons/${person_id}`,
          data: updateData,
          headers,
        });
        const person = data.data as PersonData;
        return {
          content: [
            { type: 'text', text: `✅ Pessoa atualizada!\n${formatPersonSummary(person)}` },
          ],
        };
      }

      case 'delete_person': {
        if (typeof toolArgs.person_id !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, "'person_id' é obrigatório.");
        }
        await requestWithRetry({
          method: 'DELETE',
          url: `/persons/${toolArgs.person_id}`,
          headers,
        });
        return { content: [{ type: 'text', text: `✅ Pessoa ${toolArgs.person_id} excluída.` }] };
      }

      case 'search_persons': {
        if (typeof toolArgs.query !== 'string' || !toolArgs.query.trim()) {
          throw new McpError(ErrorCode.InvalidParams, "'query' é obrigatório.");
        }
        const data = await requestWithRetry<ApiResponse<PersonData>>({
          method: 'GET',
          url: '/persons',
          params: { name: toolArgs.query, page: toolArgs.page, show: toolArgs.show },
          headers,
        });
        return {
          content: [
            {
              type: 'text',
              text: `🔍 Busca por "${toolArgs.query}":\n\n${formatListResponse(data, formatPersonSummary, 'pessoa')}`,
            },
          ],
        };
      }

      // ===== COMPANIES =====
      case 'get_company': {
        if (typeof toolArgs.company_id !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, "'company_id' é obrigatório.");
        }
        const data = await requestWithRetry<ApiResponse<CompanyData>>({
          method: 'GET',
          url: `/companies/${toolArgs.company_id}`,
          headers,
        });
        const company = data.data as CompanyData;
        return {
          content: [
            {
              type: 'text',
              text: `Empresa encontrada:\n${formatCompanySummary(company)}\n\nDetalhes:\n${JSON.stringify(company, null, 2)}`,
            },
          ],
        };
      }

      case 'create_company': {
        if (!isValidCreateCompanyArgs(toolArgs)) {
          throw new McpError(ErrorCode.InvalidParams, "'name' e 'owner_id' são obrigatórios.");
        }
        const data = await requestWithRetry<ApiResponse<CompanyData>>({
          method: 'POST',
          url: '/companies',
          data: toolArgs,
          headers,
        });
        const company = data.data as CompanyData;
        return {
          content: [{ type: 'text', text: `✅ Empresa criada!\n${formatCompanySummary(company)}` }],
        };
      }

      case 'update_company': {
        if (!isValidUpdateCompanyArgs(toolArgs)) {
          throw new McpError(ErrorCode.InvalidParams, "'company_id' é obrigatório.");
        }
        const { company_id, ...updateData } = toolArgs;
        if (Object.keys(updateData).length === 0) {
          throw new McpError(ErrorCode.InvalidParams, 'Nenhum dado para atualizar.');
        }
        const data = await requestWithRetry<ApiResponse<CompanyData>>({
          method: 'PUT',
          url: `/companies/${company_id}`,
          data: updateData,
          headers,
        });
        const company = data.data as CompanyData;
        return {
          content: [
            { type: 'text', text: `✅ Empresa atualizada!\n${formatCompanySummary(company)}` },
          ],
        };
      }

      case 'delete_company': {
        if (typeof toolArgs.company_id !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, "'company_id' é obrigatório.");
        }
        await requestWithRetry({
          method: 'DELETE',
          url: `/companies/${toolArgs.company_id}`,
          headers,
        });
        return { content: [{ type: 'text', text: `✅ Empresa ${toolArgs.company_id} excluída.` }] };
      }

      // ===== ACTIVITIES =====
      case 'get_activity': {
        if (typeof toolArgs.activity_id !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, "'activity_id' é obrigatório.");
        }
        const data = await requestWithRetry<ApiResponse<ActivityData>>({
          method: 'GET',
          url: `/activities/${toolArgs.activity_id}`,
          headers,
        });
        const activity = data.data as ActivityData;
        return {
          content: [
            {
              type: 'text',
              text: `Atividade encontrada:\n${formatActivitySummary(activity)}\n\nDetalhes:\n${JSON.stringify(activity, null, 2)}`,
            },
          ],
        };
      }

      case 'create_activity': {
        if (!isValidCreateActivityArgs(toolArgs)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "'title', 'activity_type_id' e 'owner_id' são obrigatórios."
          );
        }
        const data = await requestWithRetry<ApiResponse<ActivityData>>({
          method: 'POST',
          url: '/activities',
          data: toolArgs,
          headers,
        });
        const activity = data.data as ActivityData;
        return {
          content: [
            { type: 'text', text: `✅ Atividade criada!\n${formatActivitySummary(activity)}` },
          ],
        };
      }

      case 'update_activity': {
        if (!isValidUpdateActivityArgs(toolArgs)) {
          throw new McpError(ErrorCode.InvalidParams, "'activity_id' é obrigatório.");
        }
        const { activity_id, ...updateData } = toolArgs;
        if (Object.keys(updateData).length === 0) {
          throw new McpError(ErrorCode.InvalidParams, 'Nenhum dado para atualizar.');
        }
        const data = await requestWithRetry<ApiResponse<ActivityData>>({
          method: 'PUT',
          url: `/activities/${activity_id}`,
          data: updateData,
          headers,
        });
        const activity = data.data as ActivityData;
        return {
          content: [
            { type: 'text', text: `✅ Atividade atualizada!\n${formatActivitySummary(activity)}` },
          ],
        };
      }

      case 'delete_activity': {
        if (typeof toolArgs.activity_id !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, "'activity_id' é obrigatório.");
        }
        await requestWithRetry({
          method: 'DELETE',
          url: `/activities/${toolArgs.activity_id}`,
          headers,
        });
        return {
          content: [{ type: 'text', text: `✅ Atividade ${toolArgs.activity_id} excluída.` }],
        };
      }

      // ===== NOTES =====
      case 'create_note': {
        if (!isValidCreateNoteArgs(toolArgs)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "'content' e pelo menos um ID (deal_id, person_id ou company_id) são obrigatórios."
          );
        }
        const data = await requestWithRetry({
          method: 'POST',
          url: '/notes',
          data: toolArgs,
          headers,
        });
        return {
          content: [
            { type: 'text', text: `✅ Nota criada com sucesso!\n${JSON.stringify(data, null, 2)}` },
          ],
        };
      }

      case 'delete_note': {
        if (typeof toolArgs.note_id !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, "'note_id' é obrigatório.");
        }
        await requestWithRetry({
          method: 'DELETE',
          url: `/notes/${toolArgs.note_id}`,
          headers,
        });
        return { content: [{ type: 'text', text: `✅ Nota ${toolArgs.note_id} excluída.` }] };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Ferramenta desconhecida: ${name}`);
    }
  } catch (error) {
    console.error(`Erro em ${name}:`, error instanceof Error ? error.message : 'Erro desconhecido');

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data;

      let errorCode = ErrorCode.InternalError;
      let message = 'Erro na API PipeRun';

      if (status === 401 || status === 403) {
        errorCode = ErrorCode.InvalidRequest;
        message = 'Token inválido ou sem permissão';
      } else if (status === 400 || status === 422) {
        errorCode = ErrorCode.InvalidParams;
        message = `Erro de validação: ${JSON.stringify(data)}`;
      } else if (status === 404) {
        errorCode = ErrorCode.InvalidRequest;
        message = 'Recurso não encontrado';
      } else if (status === 429) {
        message = 'Rate limit excedido. Tente novamente em alguns segundos.';
      } else if (axiosError.code === 'ECONNABORTED') {
        message = 'Timeout: a requisição demorou muito';
      } else {
        message = `Erro (${status}): ${JSON.stringify(data) || axiosError.message}`;
      }

      throw new McpError(errorCode, message);
    }

    if (error instanceof McpError) throw error;

    throw new McpError(
      ErrorCode.InternalError,
      `Erro interno: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Tratamento de erros
server.onerror = (error: unknown) => {
  console.error('[MCP Error]', error);
};

process.on('SIGINT', async () => {
  console.log('Encerrando...');
  await server.close();
  process.exit(0);
});

// Iniciar servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `Servidor MCP PipeRun v0.3.0 iniciado${GLOBAL_API_TOKEN ? ' (token configurado via env)' : ''}`
  );
}

main().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
