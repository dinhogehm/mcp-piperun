# PipeRun HTTP Server

Servidor HTTP/REST para integração com PipeRun CRM. **Compatível com n8n, Zapier, Make e qualquer ferramenta que consuma APIs REST.**

## Instalação

```bash
cd piperun-http-server
npm install
npm run build
```

## Executando

```bash
# Modo produção
npm start

# Modo desenvolvimento (hot reload)
npm run dev

# Com token via variável de ambiente
PIPERUN_API_TOKEN=seu_token npm start

# Porta customizada
PORT=8080 npm start
```

## Autenticação

O servidor suporta 3 formas de autenticação (em ordem de prioridade):

1. **Header** (recomendado para n8n):
   ```
   X-PipeRun-Token: seu_token_aqui
   ```

2. **Query Parameter**:
   ```
   GET /deals?token=seu_token_aqui
   ```

3. **Variável de Ambiente**:
   ```bash
   export PIPERUN_API_TOKEN=seu_token_aqui
   npm start
   ```

---

## Uso com n8n

### Configuração Básica

1. Inicie o servidor HTTP:
   ```bash
   PIPERUN_API_TOKEN=seu_token npm start
   ```

2. No n8n, use o node **HTTP Request**

### Exemplos de Configuração no n8n

#### Listar Deals

| Campo | Valor |
|-------|-------|
| Method | GET |
| URL | `http://localhost:3000/deals` |
| Authentication | None (se usar env) ou Header Auth |
| Header Name | `X-PipeRun-Token` |
| Header Value | `seu_token` |

#### Criar um Deal

| Campo | Valor |
|-------|-------|
| Method | POST |
| URL | `http://localhost:3000/deals` |
| Body Content Type | JSON |
| Body | `{"title": "Novo Deal", "pipeline_id": 1, "stage_id": 1}` |

#### Buscar Pessoa por Nome

| Campo | Valor |
|-------|-------|
| Method | POST |
| URL | `http://localhost:3000/persons/search` |
| Body | `{"query": "João Silva"}` |

#### Atualizar um Deal

| Campo | Valor |
|-------|-------|
| Method | PUT |
| URL | `http://localhost:3000/deals/123` |
| Body | `{"title": "Deal Atualizado", "value": 5000}` |

### Workflow de Exemplo no n8n

```
[Webhook] → [HTTP Request: Buscar pessoa] → [IF: Existe?]
                                                ↓ Sim
                                           [HTTP Request: Criar deal]
                                                ↓ Não
                                           [HTTP Request: Criar pessoa] → [HTTP Request: Criar deal]
```

---

## Endpoints Disponíveis

### Deals

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/deals` | Listar deals |
| GET | `/deals/:id` | Buscar deal por ID |
| POST | `/deals` | Criar deal |
| PUT | `/deals/:id` | Atualizar deal |
| DELETE | `/deals/:id` | Deletar deal |
| POST | `/deals/search` | Buscar deals |

**Parâmetros de listagem:**
- `page` (number): Página (default: 1)
- `show` (number): Itens por página (default: 20)
- `pipeline_id` (number): Filtrar por pipeline
- `stage_id` (number): Filtrar por estágio
- `status_id` (number): Filtrar por status

**Campos para criar deal:**
```json
{
  "title": "Nome do Deal",      // obrigatório
  "pipeline_id": 1,              // obrigatório
  "stage_id": 1,                 // obrigatório
  "value": 1000,                 // opcional
  "person_id": 123,              // opcional
  "company_id": 456              // opcional
}
```

### Persons (Pessoas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/persons` | Listar pessoas |
| GET | `/persons/:id` | Buscar pessoa por ID |
| POST | `/persons` | Criar pessoa |
| PUT | `/persons/:id` | Atualizar pessoa |
| DELETE | `/persons/:id` | Deletar pessoa |
| POST | `/persons/search` | Buscar pessoas |

**Campos para criar pessoa:**
```json
{
  "name": "João Silva",          // obrigatório
  "email": "joao@email.com",     // opcional
  "phone": "11999999999",        // opcional
  "company_id": 123              // opcional
}
```

### Companies (Empresas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/companies` | Listar empresas |
| GET | `/companies/:id` | Buscar empresa por ID |
| POST | `/companies` | Criar empresa |
| PUT | `/companies/:id` | Atualizar empresa |
| DELETE | `/companies/:id` | Deletar empresa |

**Campos para criar empresa:**
```json
{
  "name": "Empresa LTDA"         // obrigatório
}
```

### Activities (Atividades)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/activities` | Listar atividades |
| GET | `/activities/:id` | Buscar atividade por ID |
| POST | `/activities` | Criar atividade |
| PUT | `/activities/:id` | Atualizar atividade |
| DELETE | `/activities/:id` | Deletar atividade |

**Parâmetros de listagem:**
- `deal_id` (number): Filtrar por deal
- `person_id` (number): Filtrar por pessoa
- `company_id` (number): Filtrar por empresa

**Campos para criar atividade:**
```json
{
  "name": "Ligar para cliente",  // obrigatório
  "type_id": 1,                  // obrigatório
  "deal_id": 123,                // opcional
  "person_id": 456,              // opcional
  "due_date": "2024-12-31"       // opcional
}
```

### Notes (Notas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/notes` | Criar nota |
| DELETE | `/notes/:id` | Deletar nota |

**Campos para criar nota:**
```json
{
  "text": "Texto da nota",       // obrigatório
  "deal_id": 123                 // obrigatório (ou person_id ou company_id)
}
```

### Pipelines e Stages

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/pipelines` | Listar pipelines |
| GET | `/stages` | Listar stages |
| GET | `/stages?pipeline_id=1` | Listar stages de um pipeline |

### Utilitários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Documentação dos endpoints |
| GET | `/health` | Health check |

---

## Deploy

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY build ./build
ENV PORT=3000
EXPOSE 3000
CMD ["node", "build/index.js"]
```

```bash
docker build -t piperun-http-server .
docker run -p 3000:3000 -e PIPERUN_API_TOKEN=seu_token piperun-http-server
```

### Docker Compose (com n8n)

```yaml
version: '3.8'
services:
  piperun-api:
    build: ./piperun-http-server
    environment:
      - PIPERUN_API_TOKEN=${PIPERUN_API_TOKEN}
      - PORT=3000
    ports:
      - "3000:3000"

  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - piperun-api

volumes:
  n8n_data:
```

No n8n, use `http://piperun-api:3000` como URL base.

---

## Respostas

Todas as respostas seguem o formato:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "count": 20,
    "page": 1,
    "pages": 5
  }
}
```

Erros:

```json
{
  "success": false,
  "error": "Mensagem de erro",
  "details": { ... }
}
```

---

## Diferenças do Servidor MCP

| Aspecto | MCP Server | HTTP Server |
|---------|-----------|-------------|
| Protocolo | JSON-RPC via stdio | REST/HTTP |
| Compatível com | Claude, Cursor | n8n, Zapier, Make, qualquer HTTP client |
| Formato | MCP Tools | REST endpoints |
| Descoberta | ListTools | GET / |
