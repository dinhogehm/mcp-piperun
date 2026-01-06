# Guia Completo: PipeRun + n8n

Este guia mostra como integrar o PipeRun CRM com n8n usando o servidor HTTP.

## Índice

1. [Instalação](#instalação)
2. [Configuração no n8n](#configuração-no-n8n)
3. [Autenticação](#autenticação)
4. [Exemplos Práticos](#exemplos-práticos)
5. [Workflows Prontos](#workflows-prontos)
6. [Referência de Endpoints](#referência-de-endpoints)
7. [Troubleshooting](#troubleshooting)

---

## Instalação

### Opção 1: Execução Local

```bash
# Clone o repositório
git clone https://github.com/dinhogehm/mcp-piperun.git
cd mcp-piperun/piperun-http-server

# Instale as dependências
npm install

# Compile
npm run build

# Execute (substitua pelo seu token)
PIPERUN_API_TOKEN=seu_token_aqui npm start
```

O servidor estará disponível em `http://localhost:3000`

### Opção 2: Docker

```bash
# Build da imagem
cd mcp-piperun
docker build -t piperun-api ./piperun-http-server

# Execute
docker run -d \
  --name piperun-api \
  -p 3000:3000 \
  -e PIPERUN_API_TOKEN=seu_token_aqui \
  piperun-api
```

### Opção 3: Docker Compose (n8n + PipeRun API)

Crie um arquivo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  piperun-api:
    build: ./piperun-http-server
    container_name: piperun-api
    environment:
      - PIPERUN_API_TOKEN=${PIPERUN_API_TOKEN}
      - PORT=3000
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  n8n:
    image: n8nio/n8n
    container_name: n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=sua_senha
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - piperun-api
    restart: unless-stopped

volumes:
  n8n_data:
```

Crie um arquivo `.env`:

```env
PIPERUN_API_TOKEN=seu_token_aqui
```

Execute:

```bash
docker-compose up -d
```

Acesse:
- **n8n:** http://localhost:5678
- **PipeRun API:** http://localhost:3000

---

## Configuração no n8n

### Passo 1: Criar Credencial (Opcional mas Recomendado)

1. No n8n, vá em **Settings** → **Credentials**
2. Clique em **Add Credential**
3. Selecione **Header Auth**
4. Configure:
   - **Name:** PipeRun API
   - **Header Name:** `X-PipeRun-Token`
   - **Header Value:** `seu_token_aqui`

### Passo 2: Usar o Node HTTP Request

1. Adicione um node **HTTP Request**
2. Configure:
   - **Method:** GET, POST, PUT ou DELETE
   - **URL:** `http://localhost:3000/endpoint`
   - **Authentication:** Header Auth → PipeRun API

---

## Autenticação

O servidor aceita 3 formas de autenticação:

### 1. Header (Recomendado)

```
Header Name: X-PipeRun-Token
Header Value: seu_token
```

### 2. Query Parameter

```
URL: http://localhost:3000/deals?token=seu_token
```

### 3. Variável de Ambiente

Se você configurou `PIPERUN_API_TOKEN` ao iniciar o servidor, não precisa enviar o token em cada requisição.

---

## Exemplos Práticos

### Exemplo 1: Listar Deals

**Node HTTP Request:**

| Campo | Valor |
|-------|-------|
| Method | GET |
| URL | `http://localhost:3000/deals` |
| Authentication | Header Auth |

**Query Parameters (opcionais):**

| Parâmetro | Descrição |
|-----------|-----------|
| `page` | Número da página (default: 1) |
| `show` | Itens por página (default: 20) |
| `pipeline_id` | Filtrar por pipeline |
| `stage_id` | Filtrar por estágio |

**Exemplo de URL com filtros:**
```
http://localhost:3000/deals?page=1&show=50&pipeline_id=1
```

---

### Exemplo 2: Criar um Deal

**Node HTTP Request:**

| Campo | Valor |
|-------|-------|
| Method | POST |
| URL | `http://localhost:3000/deals` |
| Body Content Type | JSON |
| Authentication | Header Auth |

**Body:**
```json
{
  "title": "Novo Negócio",
  "pipeline_id": 1,
  "stage_id": 1,
  "value": 5000,
  "person_id": 123
}
```

**Campos obrigatórios:**
- `title` - Nome do deal
- `pipeline_id` - ID do pipeline/funil
- `stage_id` - ID da etapa

---

### Exemplo 3: Buscar Pessoa por Nome

**Node HTTP Request:**

| Campo | Valor |
|-------|-------|
| Method | POST |
| URL | `http://localhost:3000/persons/search` |
| Body Content Type | JSON |

**Body:**
```json
{
  "query": "João Silva",
  "page": 1,
  "show": 10
}
```

---

### Exemplo 4: Criar Pessoa e Associar a um Deal

**Workflow com 2 nodes:**

**Node 1 - Criar Pessoa:**

| Campo | Valor |
|-------|-------|
| Method | POST |
| URL | `http://localhost:3000/persons` |

```json
{
  "name": "Maria Santos",
  "email": "maria@empresa.com",
  "phone": "11999999999"
}
```

**Node 2 - Criar Deal (usando ID da pessoa):**

| Campo | Valor |
|-------|-------|
| Method | POST |
| URL | `http://localhost:3000/deals` |

```json
{
  "title": "Deal da Maria",
  "pipeline_id": 1,
  "stage_id": 1,
  "person_id": {{ $json.data.id }}
}
```

---

### Exemplo 5: Atualizar Deal

**Node HTTP Request:**

| Campo | Valor |
|-------|-------|
| Method | PUT |
| URL | `http://localhost:3000/deals/123` |

**Body:**
```json
{
  "title": "Deal Atualizado",
  "value": 10000,
  "stage_id": 2
}
```

---

### Exemplo 6: Adicionar Nota a um Deal

**Node HTTP Request:**

| Campo | Valor |
|-------|-------|
| Method | POST |
| URL | `http://localhost:3000/notes` |

**Body:**
```json
{
  "text": "Cliente solicitou proposta atualizada",
  "deal_id": 123
}
```

---

## Workflows Prontos

### Workflow 1: Webhook → Criar Lead no PipeRun

```
[Webhook] → [HTTP Request: Criar Pessoa] → [HTTP Request: Criar Deal]
```

**Cenário:** Formulário do site envia dados para webhook, cria pessoa e deal automaticamente.

**Webhook - Recebe:**
```json
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "telefone": "11999999999",
  "interesse": "Produto X"
}
```

**HTTP Request 1 - Criar Pessoa:**
```
POST http://localhost:3000/persons
{
  "name": "{{ $json.nome }}",
  "email": "{{ $json.email }}",
  "phone": "{{ $json.telefone }}"
}
```

**HTTP Request 2 - Criar Deal:**
```
POST http://localhost:3000/deals
{
  "title": "Lead: {{ $node['Webhook'].json.interesse }}",
  "pipeline_id": 1,
  "stage_id": 1,
  "person_id": {{ $json.data.id }}
}
```

---

### Workflow 2: Verificar se Pessoa Existe antes de Criar

```
[Webhook] → [HTTP: Buscar Pessoa] → [IF: Existe?]
                                        ↓ Sim → [HTTP: Criar Deal com pessoa existente]
                                        ↓ Não → [HTTP: Criar Pessoa] → [HTTP: Criar Deal]
```

**HTTP Request - Buscar:**
```
POST http://localhost:3000/persons/search
{
  "query": "{{ $json.email }}"
}
```

**IF Node - Condição:**
```
{{ $json.data.length > 0 }}
```

---

### Workflow 3: Sincronização Agendada

```
[Schedule Trigger] → [HTTP: Listar Deals] → [Loop] → [Processar cada deal]
```

**Schedule Trigger:** A cada 1 hora

**HTTP Request:**
```
GET http://localhost:3000/deals?status_id=1&show=100
```

---

### Workflow 4: Notificação de Novo Deal

```
[Webhook PipeRun] → [HTTP: Buscar Deal] → [Slack/Email: Notificar]
```

Configure um webhook no PipeRun para disparar quando um deal for criado.

---

## Referência de Endpoints

### Deals (Oportunidades)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/deals` | Listar deals |
| GET | `/deals/:id` | Buscar deal por ID |
| POST | `/deals` | Criar deal |
| PUT | `/deals/:id` | Atualizar deal |
| DELETE | `/deals/:id` | Deletar deal |
| POST | `/deals/search` | Buscar deals por texto |

**Campos do Deal:**
```json
{
  "title": "string (obrigatório)",
  "pipeline_id": "number (obrigatório)",
  "stage_id": "number (obrigatório)",
  "value": "number",
  "person_id": "number",
  "company_id": "number",
  "user_id": "number",
  "status_id": "number"
}
```

---

### Persons (Pessoas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/persons` | Listar pessoas |
| GET | `/persons/:id` | Buscar pessoa por ID |
| POST | `/persons` | Criar pessoa |
| PUT | `/persons/:id` | Atualizar pessoa |
| DELETE | `/persons/:id` | Deletar pessoa |
| POST | `/persons/search` | Buscar pessoas por texto |

**Campos da Pessoa:**
```json
{
  "name": "string (obrigatório)",
  "email": "string",
  "phone": "string",
  "company_id": "number"
}
```

---

### Companies (Empresas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/companies` | Listar empresas |
| GET | `/companies/:id` | Buscar empresa por ID |
| POST | `/companies` | Criar empresa |
| PUT | `/companies/:id` | Atualizar empresa |
| DELETE | `/companies/:id` | Deletar empresa |

**Campos da Empresa:**
```json
{
  "name": "string (obrigatório)"
}
```

---

### Activities (Atividades)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/activities` | Listar atividades |
| GET | `/activities/:id` | Buscar atividade por ID |
| POST | `/activities` | Criar atividade |
| PUT | `/activities/:id` | Atualizar atividade |
| DELETE | `/activities/:id` | Deletar atividade |

**Campos da Atividade:**
```json
{
  "name": "string (obrigatório)",
  "type_id": "number (obrigatório)",
  "deal_id": "number",
  "person_id": "number",
  "company_id": "number",
  "due_date": "string (YYYY-MM-DD)"
}
```

---

### Notes (Notas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/notes` | Criar nota |
| DELETE | `/notes/:id` | Deletar nota |

**Campos da Nota:**
```json
{
  "text": "string (obrigatório)",
  "deal_id": "number (ou person_id ou company_id)"
}
```

---

### Pipelines e Stages

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/pipelines` | Listar pipelines |
| GET | `/stages` | Listar stages |
| GET | `/stages?pipeline_id=1` | Stages de um pipeline |

---

### Utilitários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Documentação da API |
| GET | `/health` | Health check |

---

## Troubleshooting

### Erro 401 - Token não fornecido

**Problema:** O servidor não está recebendo o token de autenticação.

**Solução:**
1. Verifique se o header `X-PipeRun-Token` está configurado
2. Ou adicione `?token=seu_token` na URL
3. Ou configure `PIPERUN_API_TOKEN` ao iniciar o servidor

---

### Erro 400 - Campos obrigatórios

**Problema:** Faltam campos obrigatórios no body.

**Solução:** Verifique os campos obrigatórios para cada endpoint:
- Deals: `title`, `pipeline_id`, `stage_id`
- Persons: `name`
- Companies: `name`
- Activities: `name`, `type_id`
- Notes: `text` + (`deal_id` ou `person_id` ou `company_id`)

---

### Erro de Conexão

**Problema:** n8n não consegue conectar ao servidor.

**Soluções:**
1. Verifique se o servidor está rodando: `curl http://localhost:3000/health`
2. Se usando Docker, use o nome do container: `http://piperun-api:3000`
3. Verifique se a porta 3000 está acessível

---

### Timeout

**Problema:** Requisições demoram muito e falham.

**Solução:** O servidor tem retry automático com backoff. Se persistir:
1. Verifique sua conexão com a API do PipeRun
2. Aumente o timeout no n8n (Settings do node HTTP Request)

---

## Suporte

- **Issues:** https://github.com/dinhogehm/mcp-piperun/issues
- **API PipeRun:** https://developers.pipe.run/
