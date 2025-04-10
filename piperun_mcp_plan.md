# Plano para Servidor MCP PipeRun

Este documento descreve o plano para criar um servidor MCP (Model Context Protocol) para interagir com a API do PipeRun CRM.

**Objetivo:** Expor funcionalidades chave da API do PipeRun (listar oportunidades, criar pessoas) como ferramentas MCP.

**API Base URL:** `https://api.pipe.run/v1`
**Autenticação:** API Token (fornecido via variável de ambiente `PIPERUN_API_TOKEN`)

**Fases do Projeto:**

**Fase 1: Configuração do Projeto e Implementação Principal**

1.  **Bootstrap do Projeto:**
    *   Criar diretório: `/Users/osvaldogehm/Documents/Cline/MCP/piperun-mcp-server`.
    *   Inicializar projeto Node.js com TypeScript (`@modelcontextprotocol/create-server` ou manualmente).
    *   Instalar dependências: `@modelcontextprotocol/sdk`, `axios`.

2.  **Implementar Lógica do Servidor (`src/index.ts`):**
    *   **Inicialização:**
        *   Importar módulos necessários.
        *   Obter `PIPERUN_API_TOKEN` das variáveis de ambiente (fornecidas via config MCP). Tratar erro se o token estiver ausente.
        *   Criar instância `axios` configurada com a URL base e cabeçalho de autorização (`Authorization: Token SEU_API_TOKEN`).
    *   **Definição das Ferramentas (`ListToolsRequestSchema` handler):**
        *   Definir ferramenta `list_deals`:
            *   `name`: `list_deals`
            *   `description`: "Recupera uma lista de oportunidades do PipeRun CRM."
            *   `inputSchema`: (Opcional) Definir propriedades para filtros/paginação (ex: `status`, `pipeline_id`, `page`, `limit`).
        *   Definir ferramenta `create_person`:
            *   `name`: `create_person`
            *   `description`: "Cria uma nova pessoa (lead/contato) no PipeRun CRM."
            *   `inputSchema`:
                *   `type`: `object`
                *   `properties`:
                    *   `name`: { `type`: `string`, `description`: "Nome da pessoa" }
                    *   `owner_id`: { `type`: `integer`, `description`: "ID do usuário responsável" }
                    *   `email`: { `type`: `string`, `description`: "(Opcional) Email da pessoa" }
                    *   `phone`: { `type`: `string`, `description`: "(Opcional) Telefone da pessoa" }
                    *   `company_id`: { `type`: `integer`, `description`: "(Opcional) ID da empresa associada" }
                    *   *(Adicionar outros campos opcionais relevantes)*
                *   `required`: [`name`, `owner_id`]
    *   **Execução das Ferramentas (`CallToolRequestSchema` handler):**
        *   Implementar roteamento para handlers `list_deals` e `create_person`.
        *   **Handler `list_deals`:** Fazer GET para `/deals`, processar resposta, tratar erros.
        *   **Handler `create_person`:** Validar `name` e `owner_id`, fazer POST para `/persons`, processar resposta, tratar erros.
    *   **Boilerplate do Servidor:** Incluir configuração padrão do servidor MCP.

3.  **Build:** Adicionar script `npm run build` ao `package.json` (`tsc`).

**Fase 2: Configuração e Implantação**

4.  **Obter Token da API:** Solicitar ao usuário o Token da API PipeRun.
5.  **Configurar MCP Settings:**
    *   Ler `/Users/osvaldogehm/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json`.
    *   Adicionar entrada para `piperun-mcp-server`:
        ```json
        "piperun-mcp-server": {
          "command": "node",
          "args": ["/Users/osvaldogehm/Documents/Cline/MCP/piperun-mcp-server/build/index.js"],
          "env": {
            "PIPERUN_API_TOKEN": "SEU_TOKEN_FORNECIDO"
          },
          "disabled": false,
          "alwaysAllow": []
        }
        ```
    *   Escrever o arquivo atualizado.

**Fase 3: Verificação**

6.  **Recarga do Sistema:** O sistema tentará iniciar o novo servidor.
7.  **Verificar Status:** Confirmar que `piperun-mcp-server` está conectado e as ferramentas `list_deals` e `create_person` estão disponíveis.

**Diagrama Visual (Mermaid):**

```mermaid
graph TD
    A[Início: Requisição do Usuário] --> B(Fase 1: Setup e Implementação);
    B --> B1(Bootstrap do Projeto);
    B --> B2(Implementar Lógica do Servidor);
    B2 --> B2a(Definir Ferramentas: list_deals, create_person);
    B2 --> B2b(Implementar Handlers das Ferramentas);
    B --> B3(Build do Projeto);

    B3 --> C(Fase 2: Configuração);
    C --> C1(Solicitar Token API ao Usuário);
    C --> C2(Atualizar Arquivo MCP Settings);

    C2 --> D(Fase 3: Verificação);
    D --> D1(Sistema Recarrega Servidor);
    D --> D2(Verificar Servidor e Ferramentas Disponíveis);
    D2 --> E[Fim: Servidor Pronto];

    subgraph "Lógica do Servidor (src/index.ts)"
        B2a; B2b;
    end

    subgraph "MCP Settings (mcp_settings.json)"
        C2;
    end