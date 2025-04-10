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

// 1. Obter o Token da API do ambiente ou de argumentos da linha de comando
let API_TOKEN = process.env.PIPERUN_API_TOKEN;

// Verificar se o token foi passado como argumento da linha de comando
const tokenArgIndex = process.argv.findIndex(arg => arg === '--token' || arg === '-t');
if (tokenArgIndex !== -1 && process.argv.length > tokenArgIndex + 1) {
  API_TOKEN = process.argv[tokenArgIndex + 1];
}

// Usar um token de teste se nenhum token for fornecido (apenas para fins de demonstração)
if (!API_TOKEN) {
  console.error("Aviso: Nenhum token de API fornecido. Usando token de demonstração 'e9c00ac9c6120c6afdbcba7d0db61fa9'.");
  API_TOKEN = 'e9c00ac9c6120c6afdbcba7d0db61fa9';
}

// 2. Configurar instância do Axios
const PIPERUN_API_BASE_URL = "https://api.pipe.run/v1";
const axiosInstance = axios.create({
  baseURL: PIPERUN_API_BASE_URL,
  headers: {
    'token': `${API_TOKEN}`,
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
  // Adicionar outros campos opcionais conforme necessário
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

// 3. Criar o servidor MCP
const server = new Server(
  {
    name: "piperun-mcp-server", // Nome definido durante a criação
    version: "0.1.0",
  },
  {
    capabilities: {
      // Apenas ferramentas são necessárias por enquanto
      tools: {},
    },
  }
);

// 4. Handler para listar as ferramentas disponíveis
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_deals",
        description: "Recupera uma lista de oportunidades do PipeRun CRM.",
        // Input schema opcional para filtros pode ser adicionado aqui depois
        inputSchema: {
          type: "object",
          properties: {
             // Exemplo: adicionar filtros como pipeline_id, status, etc.
             pipeline_id: { type: "number", description: "(Opcional) ID do funil para filtrar oportunidades" },
             page: { type: "number", description: "(Opcional) Número da página para paginação" },
             limit: { type: "number", description: "(Opcional) Número de itens por página" }
          },
          required: []
        }
      },
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
            // Adicionar outros campos opcionais aqui
          },
          required: ["name", "owner_id"],
        },
      },
    ],
  };
});

// 5. Handler para chamar as ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  try {
    switch (request.params.name) {
      case "list_deals": {
        // Extrair parâmetros opcionais de paginação/filtro
        const params = request.params.arguments || {};

        const response = await axiosInstance.get('/deals', { params });
        return {
          content: [{
            type: "text",
            text: JSON.stringify(response.data, null, 2), // Retorna a resposta da API formatada
          }],
        };
      }

      case "create_person": {
        const args = request.params.arguments;

        // Validar argumentos
        if (!isValidCreatePersonArgs(args)) {
          throw new McpError(ErrorCode.InvalidParams, "Argumentos inválidos para create_person. 'name' (string) e 'owner_id' (number) são obrigatórios.");
        }

        // Construir corpo da requisição apenas com os campos fornecidos
        const personData: Partial<CreatePersonArgs> = {
            name: args.name,
            owner_id: args.owner_id,
        };
        if (args.email) personData.email = args.email;
        if (args.phone) personData.phone = args.phone;
        if (args.company_id) personData.company_id = args.company_id;
        // Adicionar outros campos opcionais aqui se existirem nos args

        const response = await axiosInstance.post('/persons', personData);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(response.data, null, 2), // Retorna a pessoa criada
          }],
        };
      }

      default:
        // Ferramenta desconhecida
        throw new McpError(ErrorCode.MethodNotFound, `Ferramenta desconhecida: ${request.params.name}`);
    }
  } catch (error) {
    console.error(`Erro ao executar a ferramenta ${request.params.name}:`, error);

    // Tratar erros específicos do Axios (API PipeRun)
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data;
      const message = `Erro na API PipeRun (${status}): ${JSON.stringify(data) || axiosError.message}`;

      // Mapear para erros MCP apropriados
      let errorCode = ErrorCode.InternalError;
      if (status === 401 || status === 403) {
          errorCode = ErrorCode.InvalidRequest; // Token inválido ou sem permissão (usando InvalidRequest)
      } else if (status === 400 || status === 422) {
          errorCode = ErrorCode.InvalidParams; // Erro de validação da API
      } else if (status === 404) {
          errorCode = ErrorCode.InvalidRequest; // Recurso não encontrado (usando InvalidRequest)
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
  console.error("Servidor MCP PipeRun rodando via stdio..."); // Log para stderr para não interferir na comunicação MCP
}

main().catch((error) => {
  console.error("Erro fatal no servidor MCP:", error);
  process.exit(1);
});
