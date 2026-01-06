# MCP PipeRun

Servidor MCP (Model Context Protocol) para integração com a API do [PipeRun CRM](https://www.pipe.run/).

Este servidor permite que assistentes de IA (como Claude, Cline, etc.) interajam diretamente com o seu CRM PipeRun, possibilitando gerenciar oportunidades, contatos, empresas, atividades e muito mais.

## Pré-requisitos

- **Node.js** v18 ou superior
- **npm** (geralmente instalado junto com o Node.js)
- **Token da API do PipeRun** (veja como obter abaixo)

## Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd mcp-piperun
```

2. Instale as dependências e compile o servidor:
```bash
cd piperun-mcp-server
npm install
npm run build
```

## Como Obter o Token da API do PipeRun

1. Faça login na sua conta do [PipeRun](https://app.pipe.run/)
2. Acesse **Configurações** > **Integrações** > **API**
3. Copie o seu **Token de API**

> **Importante:** Guarde o token em local seguro. Ele será usado em cada chamada de ferramenta.

## Configuração no Cliente MCP

### Claude Desktop

Adicione a configuração no arquivo de configuração do Claude Desktop:

**MacOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "piperun": {
      "command": "node",
      "args": ["/caminho/completo/para/mcp-piperun/piperun-mcp-server/build/index.js"]
    }
  }
}
```

### Claude Code (CLI)

Adicione a configuração ao arquivo `.claude/settings.json` do seu projeto ou nas configurações globais:

```json
{
  "mcpServers": {
    "piperun": {
      "command": "node",
      "args": ["/caminho/completo/para/mcp-piperun/piperun-mcp-server/build/index.js"]
    }
  }
}
```

### Cline (VS Code)

Adicione nas configurações MCP do Cline:

```json
{
  "piperun-mcp-server": {
    "command": "node",
    "args": ["/caminho/completo/para/mcp-piperun/piperun-mcp-server/build/index.js"]
  }
}
```

> **Nota:** Substitua `/caminho/completo/para/` pelo caminho real onde você clonou o repositório.

## Autenticação

Este servidor utiliza autenticação **por chamada de ferramenta**. Isso significa que você deve fornecer o `api_token` como argumento em cada chamada de ferramenta. Isso permite:

- Maior segurança (token não armazenado em variáveis de ambiente)
- Flexibilidade para usar tokens diferentes se necessário
- Controle granular sobre cada requisição

## Ferramentas Disponíveis

Todas as ferramentas requerem o parâmetro `api_token`.

### Oportunidades (Deals)

| Ferramenta | Descrição | Parâmetros |
|------------|-----------|------------|
| `list_deals` | Lista oportunidades | `pipeline_id`, `stage_id`, `person_id`, `company_id`, `owner_id`, `status`, `page`, `show` (opcionais) |
| `get_deal` | Detalhes de uma oportunidade | `deal_id` (obrigatório) |
| `create_deal` | Cria uma oportunidade | `title`, `pipeline_id`, `stage_id`, `owner_id` (obrigatórios); `person_id`, `company_id`, `value` (opcionais) |
| `update_deal` | Atualiza uma oportunidade | `deal_id` (obrigatório); `title`, `pipeline_id`, `stage_id`, `owner_id`, `person_id`, `company_id`, `value`, `status` (opcionais) |
| `list_deal_sources` | Lista origens de oportunidades | - |

### Pessoas (Contatos/Leads)

| Ferramenta | Descrição | Parâmetros |
|------------|-----------|------------|
| `list_persons` | Lista pessoas | `owner_id`, `company_id`, `page`, `show` (opcionais) |
| `get_person` | Detalhes de uma pessoa | `person_id` (obrigatório) |
| `create_person` | Cria uma pessoa | `name`, `owner_id` (obrigatórios); `email`, `phone`, `company_id` (opcionais) |
| `update_person` | Atualiza uma pessoa | `person_id` (obrigatório); `name`, `owner_id`, `email`, `phone`, `company_id` (opcionais) |

### Empresas (Companies)

| Ferramenta | Descrição | Parâmetros |
|------------|-----------|------------|
| `list_companies` | Lista empresas | `page`, `show` (opcionais) |
| `get_company` | Detalhes de uma empresa | `company_id` (obrigatório) |
| `create_company` | Cria uma empresa | `name`, `owner_id` (obrigatórios); `email`, `phone` (opcionais) |
| `update_company` | Atualiza uma empresa | `company_id` (obrigatório); `name`, `owner_id`, `email`, `phone` (opcionais) |

### Funis e Etapas

| Ferramenta | Descrição | Parâmetros |
|------------|-----------|------------|
| `list_pipelines` | Lista funis | `page`, `show` (opcionais) |
| `list_stages` | Lista etapas de funil | `pipeline_id`, `page`, `show` (opcionais) |

### Atividades

| Ferramenta | Descrição | Parâmetros |
|------------|-----------|------------|
| `list_activities` | Lista atividades | `deal_id`, `owner_id`, `activity_type_id`, `status`, `page`, `show` (opcionais) |
| `list_activity_types` | Lista tipos de atividades | - |

### Notas

| Ferramenta | Descrição | Parâmetros |
|------------|-----------|------------|
| `list_notes` | Lista notas | `deal_id`, `person_id`, `company_id`, `page`, `show` (opcionais) |
| `create_note` | Cria uma nota | `content` (obrigatório); `deal_id`, `person_id` ou `company_id` (pelo menos um) |

### Outros

| Ferramenta | Descrição | Parâmetros |
|------------|-----------|------------|
| `list_items` | Lista produtos | `page`, `show` (opcionais) |
| `list_users` | Lista usuários/vendedores | `page`, `show` (opcionais) |
| `list_custom_fields` | Lista campos customizados | - |
| `list_tags` | Lista tags | - |
| `list_loss_reasons` | Lista motivos de perda | - |

## Exemplos de Uso

Ao conversar com um assistente de IA configurado com este MCP, você pode fazer requisições como:

> "Liste minhas oportunidades no PipeRun"

> "Crie um novo contato chamado João Silva com email joao@empresa.com"

> "Quais são os funis disponíveis no meu CRM?"

> "Crie uma oportunidade chamada 'Projeto X' no funil principal"

> "Atualize o status da oportunidade 12345 para ganha"

> "Adicione uma nota na oportunidade 12345"

O assistente irá solicitar o token da API se necessário e executar as operações correspondentes.

## Desenvolvimento

Para desenvolvimento com recompilação automática:

```bash
cd piperun-mcp-server
npm run watch
```

Para depuração, use o MCP Inspector:

```bash
cd piperun-mcp-server
npm run inspector
```

## Estrutura do Projeto

```
mcp-piperun/
├── README.md                    # Este arquivo
├── piperun-mcp-server/          # Servidor MCP
│   ├── src/
│   │   └── index.ts            # Código fonte principal
│   ├── build/                   # Código compilado (após npm run build)
│   ├── package.json
│   └── tsconfig.json
├── test-piperun-api.js          # Script de teste da API
└── piperun_mcp_plan.md          # Documento de planejamento
```

## Changelog

### v0.2.0
- Adicionadas novas ferramentas: `list_persons`, `get_person`, `update_person`, `get_deal`, `create_deal`, `update_deal`
- Adicionado timeout de 30 segundos nas requisições HTTP
- Padronização dos tipos de schema (integer para IDs)
- Validação de argumentos para todas as ferramentas de criação e atualização
- Melhoria no tratamento de erros (timeout, validação, etc.)
- Código refatorado para melhor manutenibilidade

### v0.1.0
- Versão inicial com ferramentas básicas de listagem e criação

## Referências

- [Documentação da API do PipeRun](https://developers.pipe.run/)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [MCP SDK para TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)

## Licença

Este projeto é disponibilizado como código aberto.
