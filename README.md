# MCP PipeRun

[![CI](https://github.com/dinhogehm/mcp-piperun/actions/workflows/ci.yml/badge.svg)](https://github.com/dinhogehm/mcp-piperun/actions/workflows/ci.yml)

Servidor MCP (Model Context Protocol) para integração com a API do [PipeRun CRM](https://www.pipe.run/).

Este servidor permite que assistentes de IA (como Claude, Cline, etc.) interajam diretamente com o seu CRM PipeRun, possibilitando gerenciar oportunidades, contatos, empresas, atividades e muito mais.

## Recursos

- **32 ferramentas** para gerenciar completamente o PipeRun
- **CRUD completo** para deals, persons, companies, activities e notes
- **Busca** por oportunidades e pessoas
- **Respostas formatadas** - resumos legíveis ao invés de JSON bruto
- **Retry automático** com backoff exponencial para resiliência
- **Autenticação flexível** - via variável de ambiente ou por chamada
- **TypeScript** com tipagem completa
- **Testes automatizados** com Vitest
- **CI/CD** com GitHub Actions

## Pré-requisitos

- **Node.js** v18 ou superior
- **npm** (geralmente instalado junto com o Node.js)
- **Token da API do PipeRun**

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/dinhogehm/mcp-piperun.git
cd mcp-piperun
```

2. Instale as dependências e compile:
```bash
cd piperun-mcp-server
npm install
npm run build
```

## Como Obter o Token da API

1. Faça login na sua conta do [PipeRun](https://app.pipe.run/)
2. Acesse **Configurações** > **Integrações** > **API**
3. Copie o seu **Token de API**

## Configuração

### Opção 1: Variável de Ambiente (Recomendado)

Configure `PIPERUN_API_TOKEN` no seu ambiente:

```json
{
  "mcpServers": {
    "piperun": {
      "command": "node",
      "args": ["/caminho/para/mcp-piperun/piperun-mcp-server/build/index.js"],
      "env": {
        "PIPERUN_API_TOKEN": "seu_token_aqui"
      }
    }
  }
}
```

### Opção 2: Token por Chamada

Passe o `api_token` como argumento em cada chamada de ferramenta.

### Locais do Arquivo de Configuração

- **Claude Desktop (MacOS):** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Desktop (Windows):** `%APPDATA%/Claude/claude_desktop_config.json`
- **Claude Desktop (Linux):** `~/.config/Claude/claude_desktop_config.json`
- **Claude Code:** `.claude/settings.json`

## Ferramentas Disponíveis (32 total)

### Oportunidades (Deals) - 7 ferramentas

| Ferramenta | Descrição |
|------------|-----------|
| `list_deals` | Lista oportunidades com filtros |
| `get_deal` | Detalhes de uma oportunidade |
| `create_deal` | Cria uma oportunidade |
| `update_deal` | Atualiza uma oportunidade |
| `delete_deal` | Exclui uma oportunidade |
| `search_deals` | Busca por título |
| `list_deal_sources` | Lista origens |

### Pessoas (Persons) - 6 ferramentas

| Ferramenta | Descrição |
|------------|-----------|
| `list_persons` | Lista pessoas/contatos |
| `get_person` | Detalhes de uma pessoa |
| `create_person` | Cria uma pessoa |
| `update_person` | Atualiza uma pessoa |
| `delete_person` | Exclui uma pessoa |
| `search_persons` | Busca por nome/email |

### Empresas (Companies) - 5 ferramentas

| Ferramenta | Descrição |
|------------|-----------|
| `list_companies` | Lista empresas |
| `get_company` | Detalhes de uma empresa |
| `create_company` | Cria uma empresa |
| `update_company` | Atualiza uma empresa |
| `delete_company` | Exclui uma empresa |

### Atividades - 6 ferramentas

| Ferramenta | Descrição |
|------------|-----------|
| `list_activities` | Lista atividades |
| `get_activity` | Detalhes de uma atividade |
| `create_activity` | Cria uma atividade |
| `update_activity` | Atualiza uma atividade |
| `delete_activity` | Exclui uma atividade |
| `list_activity_types` | Lista tipos |

### Notas - 3 ferramentas

| Ferramenta | Descrição |
|------------|-----------|
| `list_notes` | Lista notas |
| `create_note` | Cria uma nota |
| `delete_note` | Exclui uma nota |

### Outros - 5 ferramentas

| Ferramenta | Descrição |
|------------|-----------|
| `list_pipelines` | Lista funis |
| `list_stages` | Lista etapas |
| `list_items` | Lista produtos |
| `list_users` | Lista usuários |
| `list_custom_fields` | Lista campos customizados |
| `list_tags` | Lista tags |
| `list_loss_reasons` | Lista motivos de perda |

## Exemplos de Uso

```
> Liste minhas oportunidades abertas

[12345] Projeto ABC | R$ 50.000 | Aberta | Etapa: Negociação | Responsável: João
[12346] Contrato XYZ | R$ 25.000 | Aberta | Etapa: Proposta | Responsável: Maria

📊 Total: 2 | Página: 1/1
```

```
> Crie uma oportunidade "Novo Cliente" no funil 1, etapa 1, responsável 100

✅ Oportunidade criada com sucesso!
[12347] Novo Cliente | Sem valor | Aberta | Etapa: Prospecção | Responsável: João
```

```
> Busque pessoas com nome "Silva"

🔍 Busca por "Silva":

[100] João Silva | joao@email.com | 11999999999 | Empresa: ABC Ltda
[101] Maria Silva | maria@email.com | Sem contato | Empresa: N/A

📊 Total: 2 | Página: 1/1
```

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Compilar
npm run build

# Modo watch (recompila automaticamente)
npm run watch

# Executar linter
npm run lint

# Formatar código
npm run format

# Executar testes
npx vitest run

# Depuração com MCP Inspector
npm run inspector
```

## Estrutura do Projeto

```
mcp-piperun/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD
├── piperun-mcp-server/
│   ├── src/
│   │   ├── index.ts           # Código principal
│   │   └── __tests__/         # Testes
│   ├── build/                  # Código compilado
│   ├── eslint.config.js       # Configuração ESLint
│   ├── vitest.config.ts       # Configuração Vitest
│   ├── .prettierrc            # Configuração Prettier
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
└── README.md
```

## Changelog

### v0.3.0
- Adicionadas ferramentas de delete (deal, person, company, activity, note)
- Adicionadas ferramentas de atividades (get, create, update)
- Adicionadas ferramentas de busca (search_deals, search_persons)
- Adicionado retry com backoff exponencial (3 tentativas)
- Adicionada autenticação via variável de ambiente `PIPERUN_API_TOKEN`
- Respostas formatadas com resumos legíveis
- Configuração de ESLint + Prettier
- Testes automatizados com Vitest
- CI/CD com GitHub Actions

### v0.2.0
- Adicionadas ferramentas: list_persons, get_person, update_person, get_deal, create_deal, update_deal
- Timeout de 30 segundos nas requisições
- Validação de argumentos para todas as operações

### v0.1.0
- Versão inicial com ferramentas básicas

## Referências

- [Documentação da API do PipeRun](https://developers.pipe.run/)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [MCP SDK para TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)

## Licença

Este projeto é disponibilizado como código aberto.
