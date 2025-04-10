#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema, // Schema para validação
  ListToolsRequestSchema, // Schema para validação
  McpError,
  ErrorCode,
  CallToolRequest, // Tipo para o parâmetro da requisição
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosError } from 'axios';

// 1. Ler o Token da API da variável de ambiente
const API_TOKEN = process.env.PIPERUN_API_TOKEN;

if (!API_TOKEN) {
  console.error("Erro: A variável de ambiente PIPERUN_API_TOKEN não está definida.");
  console.error("Por favor, inicie o servidor fornecendo o token. Exemplo:");
  console.error('PIPERUN_API_TOKEN="SEU_TOKEN_AQUI" node ./build/index.js');
  process.exit(1); // Encerra o processo com erro
}

// 2. Configurar instância do Axios com o token global
const PIPERUN_API_BASE_URL = "https://api.pipe.run/v1";
const axiosInstance = axios.create({
  baseURL: PIPERUN_API_BASE_URL,
  headers: {
    'token': API_TOKEN, // Usa o token lido da variável de ambiente
    'Content-Type': 'application/json',
  },
});

// Interface para validação dos argumentos de create_person
interface CreatePersonArgs {
  name: string;
  owner_id: number;
  email?: string;
  phone?: string;
  company_id?: number;
}

// Função de type guard para validar os argumentos de create_person
function isValidCreatePersonArgs(args: any): args is CreatePersonArgs {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.name === 'string' && args.name.trim() !== '' &&
    typeof args.owner_id === 'number' &&
    (args.email === undefined || typeof args.email === 'string') &&
    (args.phone === undefined || typeof args.phone === 'string') &&
    (args.company_id === undefined || typeof args.company_id === 'number')
  );
}

// Interface para validação dos argumentos de create_note
interface CreateNoteArgs {
    content: string;
    deal_id?: number;
    person_id?: number;
    company_id?: number;
}

// Função de type guard para validar os argumentos de create_note
function isValidCreateNoteArgs(args: any): args is CreateNoteArgs {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.content === 'string' && args.content.trim() !== '' &&
    (typeof args.deal_id === 'number' || typeof args.person_id === 'number' || typeof args.company_id === 'number')
  );
}


// 3. Criar o servidor MCP
const server = new Server(
  {
    name: "piperun-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 4. Handler para listar as ferramentas disponíveis
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Define o schema base para ferramentas de listagem simples (sem parâmetros)
   const listToolSimpleInputSchema = { type: "object", properties: {}, required: [] };

  // Define o schema base para ferramentas de listagem com paginação
  const listToolPaginatedInputSchema = {
    type: "object",
    properties: {
      page: { type: "number", description: "(Opcional) Número da página (padrão: 1)" },
      show: { type: "number", description: "(Opcional) Quantidade por página (padrão: 20, máx: 200)" }
    },
    required: [] // Nenhum parâmetro obrigatório além do token (que agora é global)
  };

  // Define o schema para list_activities (mais complexo)
  const listActivitiesInputSchema = {
    type: "object",
    properties: {
      page: { type: "number", description: "(Opcional) Número da página (padrão: 1)" },
      show: { type: "number", description: "(Opcional) Quantidade por página (padrão: 15, máx: 200)" },
      "with": { type: "string", description: "(Opcional) Entidades relacionadas a incluir (ex: 'deal,owner')" },
      sort: { type: "string", description: "(Opcional) Coluna para ordenar" },
      desc: { type: "boolean", description: "(Opcional) Ordenar decrescente (true) ou crescente (false)" },
      deal_id: { type: "number", description: "(Opcional) Filtrar por ID da oportunidade" },
      owner_id: { type: "number", description: "(Opcional) Filtrar por ID do responsável" },
      requester_id: { type: "number", description: "(Opcional) Filtrar por ID do criador" },
      title: { type: "string", description: "(Opcional) Filtrar por título" },
      activity_type_id: { type: "number", description: "(Opcional) Filtrar por ID do tipo de atividade" },
      status: { type: "number", description: "(Opcional) Filtrar por status (0=Aberta, 2=Concluída, 4=No Show)" },
      start_at_start: { type: "string", format: "date-time", description: "(Opcional) Data/hora início (início período)" },
      start_at_end: { type: "string", format: "date-time", description: "(Opcional) Data/hora início (fim período)" },
      end_at_start: { type: "string", format: "date-time", description: "(Opcional) Data/hora fim (início período)" },
      end_at_end: { type: "string", format: "date-time", description: "(Opcional) Data/hora fim (fim período)" },
      created_at_start: { type: "string", format: "date-time", description: "(Opcional) Data/hora criação (início período)" },
      created_at_end: { type: "string", format: "date-time", description: "(Opcional) Data/hora criação (fim período)" },
      updated_at_start: { type: "string", format: "date-time", description: "(Opcional) Data/hora atualização (início período)" },
      updated_at_end: { type: "string", format: "date-time", description: "(Opcional) Data/hora atualização (fim período)" },
    },
    required: []
  };

  return {
    tools: [
      // Ferramenta existente: list_deals (atualizada)
      {
        name: "list_deals",
        description: "Recupera uma lista de oportunidades do PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            pipeline_id: { type: "number", description: "(Opcional) ID do funil para filtrar oportunidades" },
            person_id: { type: "number", description: "(Opcional) ID da pessoa para filtrar oportunidades" },
            page: { type: "number", description: "(Opcional) Número da página (padrão: 1)" },
            show: { type: "number", description: "(Opcional) Quantidade por página (padrão: 20, máx: 200)" }
          },
          required: []
        }
      },
      // Ferramenta existente: create_person
      {
        name: "create_person",
        description: "Cria uma nova pessoa (lead/contato) no PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nome da pessoa" },
            owner_id: { type: "integer", description: "ID do usuário responsável" },
            email: { type: "string", description: "(Opcional) Email da pessoa" },
            phone: { type: "string", description: "(Opcional) Telefone da pessoa" },
            company_id: { type: "integer", description: "(Opcional) ID da empresa associada" },
          },
          required: ["name", "owner_id"],
        },
      },
      // Ferramentas de Listagem
      {
        name: "list_pipelines",
        description: "Recupera uma lista de funis do PipeRun CRM.",
        inputSchema: listToolPaginatedInputSchema
      },
      {
        name: "list_stages",
        description: "Recupera uma lista de etapas de funil do PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            ...listToolPaginatedInputSchema.properties,
            pipeline_id: { type: "number", description: "(Opcional) ID do funil para filtrar etapas" }
          },
          required: []
        }
      },
      {
        name: "list_items",
        description: "Recupera uma lista de produtos do PipeRun CRM.",
        inputSchema: listToolPaginatedInputSchema
      },
      {
        name: "list_users",
        description: "Recupera uma lista de usuários (vendedores) do PipeRun CRM.",
        inputSchema: listToolPaginatedInputSchema
      },
      {
        name: "list_activities",
        description: "Recupera uma lista de atividades do PipeRun CRM.",
        inputSchema: listActivitiesInputSchema
      },
      // Ferramentas de Gerenciamento de Empresas
      {
        name: "list_companies",
        description: "Recupera uma lista de empresas do PipeRun CRM.",
        inputSchema: listToolPaginatedInputSchema
      },
      {
        name: "get_company",
        description: "Recupera os detalhes de uma empresa específica do PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            company_id: { type: "integer", description: "ID da empresa a ser recuperada" }
          },
          required: ["company_id"]
        }
      },
      {
        name: "create_company",
        description: "Cria uma nova empresa no PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nome da empresa" },
            owner_id: { type: "integer", description: "ID do usuário responsável" },
            email: { type: "string", description: "(Opcional) Email principal da empresa" },
            phone: { type: "string", description: "(Opcional) Telefone principal da empresa" },
          },
          required: ["name", "owner_id"]
        }
      },
      {
        name: "update_company",
        description: "Atualiza os dados de uma empresa existente no PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            company_id: { type: "integer", description: "ID da empresa a ser atualizada" },
            name: { type: "string", description: "(Opcional) Novo nome da empresa" },
            owner_id: { type: "integer", description: "(Opcional) Novo ID do usuário responsável" },
            email: { type: "string", description: "(Opcional) Novo email principal da empresa" },
            phone: { type: "string", description: "(Opcional) Novo telefone principal da empresa" },
          },
          required: ["company_id"]
        }
      },
      // Ferramentas de Contexto e Classificação
       {
        name: "list_custom_fields",
        description: "Recupera uma lista de campos customizados do PipeRun CRM.",
        inputSchema: {
           type: "object",
           properties: {
             // entity: { type: "string", description: "(Opcional) Filtrar por entidade (ex: 'Deal', 'Person', 'Company')" }
           },
           required: []
         }
      },
      {
        name: "list_tags",
        description: "Recupera uma lista de tags do PipeRun CRM.",
        inputSchema: listToolSimpleInputSchema
      },
      {
        name: "list_loss_reasons",
        description: "Recupera uma lista de motivos de perda do PipeRun CRM.",
        inputSchema: listToolSimpleInputSchema
      },
      {
        name: "list_deal_sources",
        description: "Recupera uma lista de origens de oportunidades do PipeRun CRM.",
        inputSchema: listToolSimpleInputSchema
      },
      {
        name: "list_activity_types",
        description: "Recupera uma lista de tipos de atividades do PipeRun CRM.",
        inputSchema: listToolSimpleInputSchema
      },
      // Ferramentas de Gerenciamento de Notas
      {
        name: "list_notes",
        description: "Recupera uma lista de notas do PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            page: { type: "number", description: "(Opcional) Número da página (padrão: 1)" },
            show: { type: "number", description: "(Opcional) Quantidade por página (padrão: 20, máx: 200)" },
            deal_id: { type: "number", description: "(Opcional) Filtrar por ID da oportunidade" },
            person_id: { type: "number", description: "(Opcional) Filtrar por ID da pessoa" },
            company_id: { type: "number", description: "(Opcional) Filtrar por ID da empresa" },
          },
          required: []
        }
      },
      {
        name: "create_note",
        description: "Cria uma nova nota associada a uma oportunidade, pessoa ou empresa no PipeRun CRM.",
        inputSchema: {
          type: "object",
          properties: {
            content: { type: "string", description: "Conteúdo da nota" },
            deal_id: { type: "number", description: "(Opcional) ID da oportunidade para associar a nota" },
            person_id: { type: "number", description: "(Opcional) ID da pessoa para associar a nota" },
            company_id: { type: "number", description: "(Opcional) ID da empresa para associar a nota" },
          },
          required: ["content"] // Pelo menos um ID (deal, person, company) também é implicitamente necessário pela lógica
        }
      }
    ] // Fim do array tools
  }; // Fim do objeto de retorno
}); // Fim do setRequestHandler

// 5. Handler para chamar as ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  // Declarar 'name' aqui para estar acessível no catch
  let name: string = '';
  try {
    // Atribuir valor a 'name' dentro do try
    name = request.params.name;
    // Os argumentos agora não contêm mais o token
    const toolArgs = request.params.arguments || {};

    // O token já está configurado globalmente no axiosInstance
    // Não precisamos mais de requestHeaders aqui

    switch (name) {
      case "list_deals": {
        const response = await axiosInstance.get('/deals', { params: toolArgs });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      case "create_person": {
        const personArgs = toolArgs;
        if (!isValidCreatePersonArgs(personArgs)) {
           throw new McpError(ErrorCode.InvalidParams, "Argumentos inválidos para create_person. 'name' (string) e 'owner_id' (number) são obrigatórios.");
        }
        const personData: Partial<CreatePersonArgs> = {
            name: personArgs.name,
            owner_id: personArgs.owner_id,
        };
        if (personArgs.email) personData.email = personArgs.email;
        if (personArgs.phone) personData.phone = personArgs.phone;
        if (personArgs.company_id) personData.company_id = personArgs.company_id;
        const response = await axiosInstance.post('/persons', personData);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      // Casos para ferramentas de listagem genéricas
      case "list_pipelines":
      case "list_stages":
      case "list_items":
      case "list_users":
      case "list_activities":
      case "list_companies":
      case "list_tags":
      case "list_loss_reasons":
      case "list_deal_sources":
      case "list_activity_types":
      case "list_custom_fields":
      case "list_notes": {
        let endpoint = '';
        switch(name) {
            case "list_pipelines": endpoint = '/pipelines'; break;
            case "list_stages": endpoint = '/stages'; break;
            case "list_items": endpoint = '/items'; break;
            case "list_users": endpoint = '/users'; break;
            case "list_activities": endpoint = '/activities'; break;
            case "list_companies": endpoint = '/companies'; break;
            case "list_tags": endpoint = '/tags'; break;
            case "list_loss_reasons": endpoint = '/loss-reasons'; break;
            case "list_deal_sources": endpoint = '/deal-sources'; break;
            case "list_activity_types": endpoint = '/activity-types'; break;
            case "list_custom_fields": endpoint = '/custom-fields'; break;
            case "list_notes": endpoint = '/notes'; break;
            default: throw new McpError(ErrorCode.MethodNotFound, `Mapeamento de endpoint não encontrado para: ${name}`);
        }
        const response = await axiosInstance.get(endpoint, { params: toolArgs });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      // Casos para Gerenciamento de Empresas (GET, POST, PUT)
      case "get_company": {
        if (!toolArgs || typeof toolArgs.company_id !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, "O parâmetro 'company_id' (number) é obrigatório para get_company.");
        }
        const company_id = toolArgs.company_id;
        const queryArgs = { ...toolArgs };
        delete queryArgs.company_id;
        const response = await axiosInstance.get(`/companies/${company_id}`, { params: queryArgs });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      case "create_company": {
        const response = await axiosInstance.post('/companies', toolArgs);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

      case "update_company": {
        if (!toolArgs || typeof toolArgs.company_id !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, "O parâmetro 'company_id' (number) é obrigatório para update_company.");
        }
        const company_id = toolArgs.company_id;
        const updateData = { ...toolArgs };
        delete updateData.company_id;
        if (Object.keys(updateData).length === 0) {
             throw new McpError(ErrorCode.InvalidParams, "Nenhum dado fornecido para atualizar a empresa (além do company_id).");
        }
        const response = await axiosInstance.put(`/companies/${company_id}`, updateData);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }

       // Caso para Gerenciamento de Notas (POST)
       case "create_note": {
        const noteArgs = toolArgs;
        if (!isValidCreateNoteArgs(noteArgs)) {
           throw new McpError(ErrorCode.InvalidParams, "Argumentos inválidos para create_note. 'content' (string) e pelo menos um ID ('deal_id', 'person_id', ou 'company_id') são obrigatórios.");
        }
        const response = await axiosInstance.post('/notes', noteArgs);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      }


      default:
        // Ferramenta desconhecida
        throw new McpError(ErrorCode.MethodNotFound, `Ferramenta desconhecida: ${name}`);
    }
  } catch (error) {
    // Usar a variável 'name' declarada fora do try
    const toolName = name || request?.params?.name || 'desconhecida'; // Fallback se 'name' não foi atribuído
    console.error(`Erro ao executar a ferramenta ${toolName}:`, error);

    // Tratar erros específicos do Axios (API PipeRun)
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data;
      const message = `Erro na API PipeRun (${status}): ${JSON.stringify(data) || axiosError.message}`;

      // Mapear para erros MCP apropriados
      let errorCode = ErrorCode.InternalError;
      if (status === 401 || status === 403) {
          errorCode = ErrorCode.InvalidRequest; // Token inválido ou sem permissão
      } else if (status === 400 || status === 422) {
          errorCode = ErrorCode.InvalidParams; // Erro de validação da API
      } else if (status === 404) {
          errorCode = ErrorCode.InvalidRequest; // Recurso não encontrado
      }

      throw new McpError(errorCode, message);
    }

    // Tratar outros erros
    if (error instanceof McpError) {
        throw error; // Re-lançar erros MCP já tratados
    }

    // Erro genérico
    throw new McpError(ErrorCode.InternalError, `Erro interno do servidor: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// 6. Tratamento de erros do servidor MCP e encerramento gracioso
server.onerror = (error: unknown) => {
  console.error("[MCP Server Error]", error);
};

process.on('SIGINT', async () => {
  console.log("Recebido SIGINT. Encerrando servidor MCP...");
  await server.close();
  process.exit(0);
});

// 7. Função principal para iniciar o servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Servidor MCP PipeRun rodando via stdio..."); // Log para stderr
}

main().catch((error) => {
  console.error("Erro fatal no servidor MCP:", error);
  process.exit(1);
});
