#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
  CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosError } from 'axios';

// Configuração do Axios com timeout
const PIPERUN_API_BASE_URL = "https://api.pipe.run/v1";
const REQUEST_TIMEOUT_MS = 30000; // 30 segundos

const axiosInstance = axios.create({
  baseURL: PIPERUN_API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mapeamento de ferramentas para endpoints
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

// Interfaces para validação de argumentos
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

// Funções de validação (type guards)
function isValidCreatePersonArgs(args: unknown): args is CreatePersonArgs {
  if (typeof args !== 'object' || args === null) return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.name === 'string' && a.name.trim() !== '' &&
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
    typeof a.name === 'string' && a.name.trim() !== '' &&
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
    typeof a.title === 'string' && a.title.trim() !== '' &&
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
    typeof a.content === 'string' && a.content.trim() !== '' &&
    (typeof a.deal_id === 'number' || typeof a.person_id === 'number' || typeof a.company_id === 'number')
  );
}

// Criar o servidor MCP
const server = new Server(
  {
    name: "piperun-mcp-server",
    version: "0.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler para listar as ferramentas disponíveis
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Schema base para ferramentas simples (apenas token)
  const simpleSchema = {
    type: "object" as const,
    properties: {
      api_token: { type: "string", description: "Token da API do PipeRun" },
    },
    required: ["api_token"]
  };

  // Schema base para ferramentas com paginação
  const paginatedSchema = {
    type: "object" as const,
    properties: {
      api_token: { type: "string", description: "Token da API do PipeRun" },
      page: { type: "integer", description: "(Opcional) Número da página (padrão: 1)" },
      show: { type: "integer", description: "(Opcional) Quantidade por página (padrão: 20, máx: 200)" }
    },
    required: ["api_token"]
  };

  return {
    tools: [
      // ===== OPORTUNIDADES (DEALS) =====
      {
        name: "list_deals",
        description: "Recupera uma lista de oportunidades do PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            pipeline_id: { type: "integer", description: "(Opcional) ID do funil para filtrar" },
            stage_id: { type: "integer", description: "(Opcional) ID da etapa para filtrar" },
            person_id: { type: "integer", description: "(Opcional) ID da pessoa para filtrar" },
            company_id: { type: "integer", description: "(Opcional) ID da empresa para filtrar" },
            owner_id: { type: "integer", description: "(Opcional) ID do responsável para filtrar" },
            status: { type: "integer", description: "(Opcional) Status: 1=Aberta, 2=Ganha, 3=Perdida" },
            page: { type: "integer", description: "(Opcional) Número da página (padrão: 1)" },
            show: { type: "integer", description: "(Opcional) Quantidade por página (padrão: 20, máx: 200)" }
          },
          required: ["api_token"]
        }
      },
      {
        name: "get_deal",
        description: "Recupera os detalhes de uma oportunidade específica do PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            deal_id: { type: "integer", description: "ID da oportunidade" }
          },
          required: ["api_token", "deal_id"]
        }
      },
      {
        name: "create_deal",
        description: "Cria uma nova oportunidade no PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            title: { type: "string", description: "Título da oportunidade" },
            pipeline_id: { type: "integer", description: "ID do funil" },
            stage_id: { type: "integer", description: "ID da etapa inicial" },
            owner_id: { type: "integer", description: "ID do usuário responsável" },
            person_id: { type: "integer", description: "(Opcional) ID da pessoa associada" },
            company_id: { type: "integer", description: "(Opcional) ID da empresa associada" },
            value: { type: "number", description: "(Opcional) Valor da oportunidade" }
          },
          required: ["api_token", "title", "pipeline_id", "stage_id", "owner_id"]
        }
      },
      {
        name: "update_deal",
        description: "Atualiza uma oportunidade existente no PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            deal_id: { type: "integer", description: "ID da oportunidade" },
            title: { type: "string", description: "(Opcional) Novo título" },
            pipeline_id: { type: "integer", description: "(Opcional) Novo ID do funil" },
            stage_id: { type: "integer", description: "(Opcional) Novo ID da etapa" },
            owner_id: { type: "integer", description: "(Opcional) Novo ID do responsável" },
            person_id: { type: "integer", description: "(Opcional) Novo ID da pessoa" },
            company_id: { type: "integer", description: "(Opcional) Novo ID da empresa" },
            value: { type: "number", description: "(Opcional) Novo valor" },
            status: { type: "integer", description: "(Opcional) Novo status: 1=Aberta, 2=Ganha, 3=Perdida" }
          },
          required: ["api_token", "deal_id"]
        }
      },
      {
        name: "list_deal_sources",
        description: "Recupera uma lista de origens de oportunidades do PipeRun CRM.",
        inputSchema: simpleSchema
      },

      // ===== PESSOAS (PERSONS) =====
      {
        name: "list_persons",
        description: "Recupera uma lista de pessoas (leads/contatos) do PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            owner_id: { type: "integer", description: "(Opcional) ID do responsável para filtrar" },
            company_id: { type: "integer", description: "(Opcional) ID da empresa para filtrar" },
            page: { type: "integer", description: "(Opcional) Número da página (padrão: 1)" },
            show: { type: "integer", description: "(Opcional) Quantidade por página (padrão: 20, máx: 200)" }
          },
          required: ["api_token"]
        }
      },
      {
        name: "get_person",
        description: "Recupera os detalhes de uma pessoa específica do PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            person_id: { type: "integer", description: "ID da pessoa" }
          },
          required: ["api_token", "person_id"]
        }
      },
      {
        name: "create_person",
        description: "Cria uma nova pessoa (lead/contato) no PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            name: { type: "string", description: "Nome da pessoa" },
            owner_id: { type: "integer", description: "ID do usuário responsável" },
            email: { type: "string", description: "(Opcional) Email da pessoa" },
            phone: { type: "string", description: "(Opcional) Telefone da pessoa" },
            company_id: { type: "integer", description: "(Opcional) ID da empresa associada" },
          },
          required: ["api_token", "name", "owner_id"],
        },
      },
      {
        name: "update_person",
        description: "Atualiza uma pessoa existente no PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            person_id: { type: "integer", description: "ID da pessoa" },
            name: { type: "string", description: "(Opcional) Novo nome" },
            owner_id: { type: "integer", description: "(Opcional) Novo ID do responsável" },
            email: { type: "string", description: "(Opcional) Novo email" },
            phone: { type: "string", description: "(Opcional) Novo telefone" },
            company_id: { type: "integer", description: "(Opcional) Novo ID da empresa" },
          },
          required: ["api_token", "person_id"],
        },
      },

      // ===== EMPRESAS (COMPANIES) =====
      {
        name: "list_companies",
        description: "Recupera uma lista de empresas do PipeRun CRM.",
        inputSchema: paginatedSchema
      },
      {
        name: "get_company",
        description: "Recupera os detalhes de uma empresa específica do PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            company_id: { type: "integer", description: "ID da empresa" }
          },
          required: ["api_token", "company_id"]
        }
      },
      {
        name: "create_company",
        description: "Cria uma nova empresa no PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            name: { type: "string", description: "Nome da empresa" },
            owner_id: { type: "integer", description: "ID do usuário responsável" },
            email: { type: "string", description: "(Opcional) Email principal da empresa" },
            phone: { type: "string", description: "(Opcional) Telefone principal da empresa" },
          },
          required: ["api_token", "name", "owner_id"]
        }
      },
      {
        name: "update_company",
        description: "Atualiza uma empresa existente no PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            company_id: { type: "integer", description: "ID da empresa" },
            name: { type: "string", description: "(Opcional) Novo nome" },
            owner_id: { type: "integer", description: "(Opcional) Novo ID do responsável" },
            email: { type: "string", description: "(Opcional) Novo email" },
            phone: { type: "string", description: "(Opcional) Novo telefone" },
          },
          required: ["api_token", "company_id"]
        }
      },

      // ===== FUNIS E ETAPAS =====
      {
        name: "list_pipelines",
        description: "Recupera uma lista de funis do PipeRun CRM.",
        inputSchema: paginatedSchema
      },
      {
        name: "list_stages",
        description: "Recupera uma lista de etapas de funil do PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            pipeline_id: { type: "integer", description: "(Opcional) ID do funil para filtrar etapas" },
            page: { type: "integer", description: "(Opcional) Número da página (padrão: 1)" },
            show: { type: "integer", description: "(Opcional) Quantidade por página (padrão: 20, máx: 200)" }
          },
          required: ["api_token"]
        }
      },

      // ===== ATIVIDADES =====
      {
        name: "list_activities",
        description: "Recupera uma lista de atividades do PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            page: { type: "integer", description: "(Opcional) Número da página (padrão: 1)" },
            show: { type: "integer", description: "(Opcional) Quantidade por página (padrão: 15, máx: 200)" },
            deal_id: { type: "integer", description: "(Opcional) Filtrar por ID da oportunidade" },
            owner_id: { type: "integer", description: "(Opcional) Filtrar por ID do responsável" },
            activity_type_id: { type: "integer", description: "(Opcional) Filtrar por ID do tipo de atividade" },
            status: { type: "integer", description: "(Opcional) Status: 0=Aberta, 2=Concluída, 4=No Show" },
          },
          required: ["api_token"]
        }
      },
      {
        name: "list_activity_types",
        description: "Recupera uma lista de tipos de atividades do PipeRun CRM.",
        inputSchema: simpleSchema
      },

      // ===== NOTAS =====
      {
        name: "list_notes",
        description: "Recupera uma lista de notas do PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            page: { type: "integer", description: "(Opcional) Número da página (padrão: 1)" },
            show: { type: "integer", description: "(Opcional) Quantidade por página (padrão: 20, máx: 200)" },
            deal_id: { type: "integer", description: "(Opcional) Filtrar por ID da oportunidade" },
            person_id: { type: "integer", description: "(Opcional) Filtrar por ID da pessoa" },
            company_id: { type: "integer", description: "(Opcional) Filtrar por ID da empresa" },
          },
          required: ["api_token"]
        }
      },
      {
        name: "create_note",
        description: "Cria uma nova nota associada a uma oportunidade, pessoa ou empresa.",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token da API do PipeRun" },
            content: { type: "string", description: "Conteúdo da nota" },
            deal_id: { type: "integer", description: "(Opcional) ID da oportunidade" },
            person_id: { type: "integer", description: "(Opcional) ID da pessoa" },
            company_id: { type: "integer", description: "(Opcional) ID da empresa" },
          },
          required: ["api_token", "content"]
        }
      },

      // ===== OUTROS =====
      {
        name: "list_items",
        description: "Recupera uma lista de produtos do PipeRun CRM.",
        inputSchema: paginatedSchema
      },
      {
        name: "list_users",
        description: "Recupera uma lista de usuários (vendedores) do PipeRun CRM.",
        inputSchema: paginatedSchema
      },
      {
        name: "list_custom_fields",
        description: "Recupera uma lista de campos customizados do PipeRun CRM.",
        inputSchema: simpleSchema
      },
      {
        name: "list_tags",
        description: "Recupera uma lista de tags do PipeRun CRM.",
        inputSchema: simpleSchema
      },
      {
        name: "list_loss_reasons",
        description: "Recupera uma lista de motivos de perda do PipeRun CRM.",
        inputSchema: simpleSchema
      }
    ]
  };
});

// Handler para executar as ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const name = request.params.name;

  try {
    const args = request.params.arguments;

    // Validar e extrair o token da API
    if (!args || typeof args !== 'object' || typeof args.api_token !== 'string' || !args.api_token.trim()) {
      throw new McpError(ErrorCode.InvalidParams, "O parâmetro 'api_token' é obrigatório.");
    }
    const api_token = args.api_token;

    // Remover o token dos argumentos
    const toolArgs = { ...args } as Record<string, unknown>;
    delete toolArgs.api_token;

    // Headers para a requisição
    const headers = {
      'token': api_token,
      'Content-Type': 'application/json',
    };

    // Verificar se é uma ferramenta de listagem genérica
    if (ENDPOINT_MAP[name]) {
      const response = await axiosInstance.get(ENDPOINT_MAP[name], { params: toolArgs, headers });
      return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
    }

    // Ferramentas específicas
    switch (name) {
      // ===== DEALS =====
      case "get_deal": {
        if (typeof toolArgs.deal_id !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, "O parâmetro 'deal_id' (number) é obrigatório.");
        }
        const deal_id = toolArgs.deal_id;
        const response = await axiosInstance.get(`/deals/${deal_id}`, { headers });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      case "create_deal": {
        if (!isValidCreateDealArgs(toolArgs)) {
          throw new McpError(ErrorCode.InvalidParams, "Argumentos inválidos. 'title', 'pipeline_id', 'stage_id' e 'owner_id' são obrigatórios.");
        }
        const response = await axiosInstance.post('/deals', toolArgs, { headers });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      case "update_deal": {
        if (!isValidUpdateDealArgs(toolArgs)) {
          throw new McpError(ErrorCode.InvalidParams, "Argumentos inválidos. 'deal_id' é obrigatório.");
        }
        const { deal_id, ...updateData } = toolArgs;
        if (Object.keys(updateData).length === 0) {
          throw new McpError(ErrorCode.InvalidParams, "Nenhum dado fornecido para atualizar.");
        }
        const response = await axiosInstance.put(`/deals/${deal_id}`, updateData, { headers });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      // ===== PERSONS =====
      case "get_person": {
        if (typeof toolArgs.person_id !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, "O parâmetro 'person_id' (number) é obrigatório.");
        }
        const person_id = toolArgs.person_id;
        const response = await axiosInstance.get(`/persons/${person_id}`, { headers });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      case "create_person": {
        if (!isValidCreatePersonArgs(toolArgs)) {
          throw new McpError(ErrorCode.InvalidParams, "Argumentos inválidos. 'name' e 'owner_id' são obrigatórios.");
        }
        const response = await axiosInstance.post('/persons', toolArgs, { headers });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      case "update_person": {
        if (!isValidUpdatePersonArgs(toolArgs)) {
          throw new McpError(ErrorCode.InvalidParams, "Argumentos inválidos. 'person_id' é obrigatório.");
        }
        const { person_id, ...updateData } = toolArgs;
        if (Object.keys(updateData).length === 0) {
          throw new McpError(ErrorCode.InvalidParams, "Nenhum dado fornecido para atualizar.");
        }
        const response = await axiosInstance.put(`/persons/${person_id}`, updateData, { headers });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      // ===== COMPANIES =====
      case "get_company": {
        if (typeof toolArgs.company_id !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, "O parâmetro 'company_id' (number) é obrigatório.");
        }
        const company_id = toolArgs.company_id;
        const response = await axiosInstance.get(`/companies/${company_id}`, { headers });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      case "create_company": {
        if (!isValidCreateCompanyArgs(toolArgs)) {
          throw new McpError(ErrorCode.InvalidParams, "Argumentos inválidos. 'name' e 'owner_id' são obrigatórios.");
        }
        const response = await axiosInstance.post('/companies', toolArgs, { headers });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      case "update_company": {
        if (!isValidUpdateCompanyArgs(toolArgs)) {
          throw new McpError(ErrorCode.InvalidParams, "Argumentos inválidos. 'company_id' é obrigatório.");
        }
        const { company_id, ...updateData } = toolArgs;
        if (Object.keys(updateData).length === 0) {
          throw new McpError(ErrorCode.InvalidParams, "Nenhum dado fornecido para atualizar.");
        }
        const response = await axiosInstance.put(`/companies/${company_id}`, updateData, { headers });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      // ===== NOTES =====
      case "create_note": {
        if (!isValidCreateNoteArgs(toolArgs)) {
          throw new McpError(ErrorCode.InvalidParams, "Argumentos inválidos. 'content' e pelo menos um ID (deal_id, person_id ou company_id) são obrigatórios.");
        }
        const response = await axiosInstance.post('/notes', toolArgs, { headers });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Ferramenta desconhecida: ${name}`);
    }
  } catch (error) {
    console.error(`Erro ao executar ferramenta ${name}:`, error instanceof Error ? error.message : 'Erro desconhecido');

    // Tratar erros do Axios
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data;

      let errorCode = ErrorCode.InternalError;
      let message = `Erro na API PipeRun`;

      if (status === 401 || status === 403) {
        errorCode = ErrorCode.InvalidRequest;
        message = "Token inválido ou sem permissão";
      } else if (status === 400 || status === 422) {
        errorCode = ErrorCode.InvalidParams;
        message = `Erro de validação: ${JSON.stringify(data)}`;
      } else if (status === 404) {
        errorCode = ErrorCode.InvalidRequest;
        message = "Recurso não encontrado";
      } else if (axiosError.code === 'ECONNABORTED') {
        message = "Timeout: a requisição demorou muito para responder";
      } else {
        message = `Erro (${status}): ${JSON.stringify(data) || axiosError.message}`;
      }

      throw new McpError(errorCode, message);
    }

    // Re-lançar erros MCP
    if (error instanceof McpError) {
      throw error;
    }

    // Erro genérico
    throw new McpError(ErrorCode.InternalError, `Erro interno: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Tratamento de erros e encerramento
server.onerror = (error: unknown) => {
  console.error("[MCP Server Error]", error);
};

process.on('SIGINT', async () => {
  console.log("Encerrando servidor MCP...");
  await server.close();
  process.exit(0);
});

// Iniciar o servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Servidor MCP PipeRun v0.2.0 iniciado");
}

main().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});
