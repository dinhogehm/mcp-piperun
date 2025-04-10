# Servidor MCP para Integração com Piperun CRM

Este é um servidor MCP (Model Context Protocol) baseado em TypeScript que fornece ferramentas para interagir com a API do [PipeRun CRM](https://www.pipe.run/).

## Autenticação

Este servidor requer um token da API do Piperun para funcionar. O token deve ser fornecido através da variável de ambiente `PIPERUN_API_TOKEN` ao iniciar o servidor.

Exemplo de inicialização:
```bash
PIPERUN_API_TOKEN="SEU_TOKEN_AQUI" node ./build/index.js
```
Se a variável de ambiente não for fornecida, o servidor exibirá um erro e não iniciará.

## Funcionalidades

Este servidor expõe diversas ferramentas para listar, criar, obter e atualizar dados no Piperun CRM. Os parâmetros específicos de cada ferramenta estão listados abaixo.

### Ferramentas Disponíveis

**Oportunidades:**
*   `list_deals`: Recupera uma lista de oportunidades. (Filtros opcionais: `pipeline_id`, `person_id`, `page`, `show`)
*   `list_deal_sources`: Recupera uma lista de origens de oportunidades. (Sem parâmetros)

**Pessoas:**
*   `create_person`: Cria uma nova pessoa (lead/contato). (Requer: `name`, `owner_id`; Opcional: `email`, `phone`, `company_id`)

**Empresas:**
*   `list_companies`: Recupera uma lista de empresas. (Filtros opcionais: `page`, `show`)
*   `get_company`: Recupera os detalhes de uma empresa específica. (Requer: `company_id`)
*   `create_company`: Cria uma nova empresa. (Requer: `name`, `owner_id`; Opcional: `email`, `phone`, etc.)
*   `update_company`: Atualiza os dados de uma empresa existente. (Requer: `company_id`; Campos opcionais: `name`, `owner_id`, `email`, `phone`, etc.)

**Funis e Etapas:**
*   `list_pipelines`: Recupera uma lista de funis. (Filtros opcionais: `page`, `show`)
*   `list_stages`: Recupera uma lista de etapas de funil. (Filtros opcionais: `pipeline_id`, `page`, `show`)

**Atividades:**
*   `list_activities`: Recupera uma lista de atividades. (Vários filtros opcionais: `page`, `show`, `with`, `sort`, `desc`, `deal_id`, `owner_id`, `requester_id`, `title`, `activity_type_id`, `status`, datas)
*   `list_activity_types`: Recupera uma lista de tipos de atividades. (Sem parâmetros)

**Notas:**
*   `list_notes`: Recupera uma lista de notas. (Filtros opcionais: `page`, `show`, `deal_id`, `person_id`, `company_id`)
*   `create_note`: Cria uma nova nota. (Requer: `content`; Associação opcional: `deal_id`, `person_id`, ou `company_id`)

**Outros:**
*   `list_items`: Recupera uma lista de produtos. (Filtros opcionais: `page`, `show`)
*   `list_users`: Recupera uma lista de usuários (vendedores). (Filtros opcionais: `page`, `show`)
*   `list_custom_fields`: Recupera uma lista de campos customizados. (Sem parâmetros)
*   `list_tags`: Recupera uma lista de tags. (Sem parâmetros)
*   `list_loss_reasons`: Recupera uma lista de motivos de perda. (Sem parâmetros)

**Observação:** Para detalhes completos sobre os parâmetros e filtros de cada ferramenta, consulte o código-fonte (`src/index.ts`) ou a documentação da API do Piperun.

## Desenvolvimento

Instale as dependências:
```bash
npm install
```

Compile o servidor:
```bash
npm run build
```

Para desenvolvimento com recompilação automática:
```bash
npm run watch
```

## Instalação

Para usar com o Cline (ou outro cliente MCP), adicione a configuração do servidor:

No MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
No Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "piperun-mcp-server": {
      "command": "/caminho/completo/para/piperun-mcp-server/build/index.js",
      "environment": {
         "PIPERUN_API_TOKEN": "SEU_TOKEN_AQUI"
      }
    }
  }
}
```
**Importante:**
*   Substitua `/caminho/completo/para/` pelo caminho real onde o projeto `piperun-mcp-server` está localizado em sua máquina.
*   Substitua `"SEU_TOKEN_AQUI"` pelo seu token real da API do Piperun.

## Debugging

Como servidores MCP se comunicam via stdio, a depuração pode ser desafiadora. Recomendamos usar o [MCP Inspector](https://github.com/modelcontextprotocol/inspector), que está disponível como um script do pacote:

```bash
npm run inspector
```

O Inspector fornecerá uma URL para acessar as ferramentas de depuração no seu navegador.
