import express from 'express';
import cors from 'cors';
import axios from 'axios';
// ============================================================================
// CONFIGURAÇÃO
// ============================================================================
const PORT = process.env.PORT || 3000;
const PIPERUN_API_BASE_URL = 'https://api.pipe.run/v1';
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
// Token global (opcional - pode ser configurado via env)
const GLOBAL_API_TOKEN = process.env.PIPERUN_API_TOKEN || '';
// ============================================================================
// CLIENTE HTTP COM RETRY
// ============================================================================
const axiosInstance = axios.create({
    baseURL: PIPERUN_API_BASE_URL,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
        'Content-Type': 'application/json',
    },
});
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function requestWithRetry(config, retries = MAX_RETRIES) {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await axiosInstance.request(config);
            return response.data;
        }
        catch (error) {
            lastError = error;
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                // Não retry para erros 4xx (exceto 429 rate limit)
                if (status && status >= 400 && status < 500 && status !== 429) {
                    throw error;
                }
                if (attempt < retries) {
                    const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
                    await sleep(delay);
                }
            }
            else {
                throw error;
            }
        }
    }
    throw lastError;
}
// ============================================================================
// EXPRESS APP
// ============================================================================
const app = express();
app.use(cors());
app.use(express.json());
// Middleware para extrair token
function getToken(req) {
    const headerToken = req.headers['x-piperun-token'];
    const queryToken = req.query.token;
    return headerToken || queryToken || GLOBAL_API_TOKEN;
}
// Middleware de autenticação
function authMiddleware(req, res, next) {
    const token = getToken(req);
    if (!token) {
        res.status(401).json({
            success: false,
            error: 'Token não fornecido. Use header X-PipeRun-Token, query param ?token=, ou configure PIPERUN_API_TOKEN',
        });
        return;
    }
    req.piperunToken = token;
    next();
}
// ============================================================================
// ROTAS - INFO
// ============================================================================
app.get('/', (_req, res) => {
    res.json({
        name: 'PipeRun HTTP Server',
        version: '1.0.0',
        description: 'API REST para integração com PipeRun CRM - Compatível com n8n',
        endpoints: {
            deals: {
                list: 'GET /deals',
                get: 'GET /deals/:id',
                create: 'POST /deals',
                update: 'PUT /deals/:id',
                delete: 'DELETE /deals/:id',
                search: 'POST /deals/search',
            },
            persons: {
                list: 'GET /persons',
                get: 'GET /persons/:id',
                create: 'POST /persons',
                update: 'PUT /persons/:id',
                delete: 'DELETE /persons/:id',
                search: 'POST /persons/search',
            },
            companies: {
                list: 'GET /companies',
                get: 'GET /companies/:id',
                create: 'POST /companies',
                update: 'PUT /companies/:id',
                delete: 'DELETE /companies/:id',
            },
            activities: {
                list: 'GET /activities',
                get: 'GET /activities/:id',
                create: 'POST /activities',
                update: 'PUT /activities/:id',
                delete: 'DELETE /activities/:id',
            },
            notes: {
                create: 'POST /notes',
                delete: 'DELETE /notes/:id',
            },
            pipelines: {
                list: 'GET /pipelines',
            },
            stages: {
                list: 'GET /stages',
            },
        },
        authentication: {
            methods: [
                'Header: X-PipeRun-Token: seu_token',
                'Query: ?token=seu_token',
                'Environment: PIPERUN_API_TOKEN',
            ],
        },
    });
});
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ============================================================================
// ROTAS - DEALS
// ============================================================================
// Listar deals
app.get('/deals', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { page = 1, show = 20, pipeline_id, stage_id, status_id } = req.query;
        const params = {
            token,
            page: Number(page),
            show: Number(show),
        };
        if (pipeline_id)
            params.pipeline_id = Number(pipeline_id);
        if (stage_id)
            params.stage_id = Number(stage_id);
        if (status_id)
            params.status_id = Number(status_id);
        const data = await requestWithRetry({
            method: 'GET',
            url: '/deals',
            params,
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Buscar deal por ID
app.get('/deals/:id', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { id } = req.params;
        const data = await requestWithRetry({
            method: 'GET',
            url: `/deals/${id}`,
            params: { token },
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Criar deal
app.post('/deals', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const dealData = req.body;
        if (!dealData.title || !dealData.pipeline_id || !dealData.stage_id) {
            res.status(400).json({
                success: false,
                error: 'Campos obrigatórios: title, pipeline_id, stage_id',
            });
            return;
        }
        const data = await requestWithRetry({
            method: 'POST',
            url: '/deals',
            params: { token },
            data: dealData,
        });
        res.status(201).json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Atualizar deal
app.put('/deals/:id', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { id } = req.params;
        const dealData = req.body;
        const data = await requestWithRetry({
            method: 'PUT',
            url: `/deals/${id}`,
            params: { token },
            data: dealData,
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Deletar deal
app.delete('/deals/:id', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { id } = req.params;
        await requestWithRetry({
            method: 'DELETE',
            url: `/deals/${id}`,
            params: { token },
        });
        res.json({ success: true, message: `Deal ${id} deletado com sucesso` });
    }
    catch (error) {
        handleError(res, error);
    }
});
// Buscar deals
app.post('/deals/search', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { query, page = 1, show = 20 } = req.body;
        if (!query) {
            res.status(400).json({
                success: false,
                error: 'Campo obrigatório: query',
            });
            return;
        }
        const data = await requestWithRetry({
            method: 'GET',
            url: '/deals',
            params: {
                token,
                search: query,
                page: Number(page),
                show: Number(show),
            },
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// ============================================================================
// ROTAS - PERSONS
// ============================================================================
// Listar persons
app.get('/persons', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { page = 1, show = 20 } = req.query;
        const data = await requestWithRetry({
            method: 'GET',
            url: '/persons',
            params: {
                token,
                page: Number(page),
                show: Number(show),
            },
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Buscar person por ID
app.get('/persons/:id', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { id } = req.params;
        const data = await requestWithRetry({
            method: 'GET',
            url: `/persons/${id}`,
            params: { token },
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Criar person
app.post('/persons', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const personData = req.body;
        if (!personData.name) {
            res.status(400).json({
                success: false,
                error: 'Campo obrigatório: name',
            });
            return;
        }
        const data = await requestWithRetry({
            method: 'POST',
            url: '/persons',
            params: { token },
            data: personData,
        });
        res.status(201).json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Atualizar person
app.put('/persons/:id', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { id } = req.params;
        const personData = req.body;
        const data = await requestWithRetry({
            method: 'PUT',
            url: `/persons/${id}`,
            params: { token },
            data: personData,
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Deletar person
app.delete('/persons/:id', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { id } = req.params;
        await requestWithRetry({
            method: 'DELETE',
            url: `/persons/${id}`,
            params: { token },
        });
        res.json({ success: true, message: `Person ${id} deletado com sucesso` });
    }
    catch (error) {
        handleError(res, error);
    }
});
// Buscar persons
app.post('/persons/search', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { query, page = 1, show = 20 } = req.body;
        if (!query) {
            res.status(400).json({
                success: false,
                error: 'Campo obrigatório: query',
            });
            return;
        }
        const data = await requestWithRetry({
            method: 'GET',
            url: '/persons',
            params: {
                token,
                search: query,
                page: Number(page),
                show: Number(show),
            },
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// ============================================================================
// ROTAS - COMPANIES
// ============================================================================
// Listar companies
app.get('/companies', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { page = 1, show = 20 } = req.query;
        const data = await requestWithRetry({
            method: 'GET',
            url: '/companies',
            params: {
                token,
                page: Number(page),
                show: Number(show),
            },
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Buscar company por ID
app.get('/companies/:id', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { id } = req.params;
        const data = await requestWithRetry({
            method: 'GET',
            url: `/companies/${id}`,
            params: { token },
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Criar company
app.post('/companies', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const companyData = req.body;
        if (!companyData.name) {
            res.status(400).json({
                success: false,
                error: 'Campo obrigatório: name',
            });
            return;
        }
        const data = await requestWithRetry({
            method: 'POST',
            url: '/companies',
            params: { token },
            data: companyData,
        });
        res.status(201).json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Atualizar company
app.put('/companies/:id', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { id } = req.params;
        const companyData = req.body;
        const data = await requestWithRetry({
            method: 'PUT',
            url: `/companies/${id}`,
            params: { token },
            data: companyData,
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Deletar company
app.delete('/companies/:id', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { id } = req.params;
        await requestWithRetry({
            method: 'DELETE',
            url: `/companies/${id}`,
            params: { token },
        });
        res.json({ success: true, message: `Company ${id} deletada com sucesso` });
    }
    catch (error) {
        handleError(res, error);
    }
});
// ============================================================================
// ROTAS - ACTIVITIES
// ============================================================================
// Listar activities
app.get('/activities', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { page = 1, show = 20, deal_id, person_id, company_id } = req.query;
        const params = {
            token,
            page: Number(page),
            show: Number(show),
        };
        if (deal_id)
            params.deal_id = Number(deal_id);
        if (person_id)
            params.person_id = Number(person_id);
        if (company_id)
            params.company_id = Number(company_id);
        const data = await requestWithRetry({
            method: 'GET',
            url: '/activities',
            params,
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Buscar activity por ID
app.get('/activities/:id', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { id } = req.params;
        const data = await requestWithRetry({
            method: 'GET',
            url: `/activities/${id}`,
            params: { token },
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Criar activity
app.post('/activities', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const activityData = req.body;
        if (!activityData.name || !activityData.type_id) {
            res.status(400).json({
                success: false,
                error: 'Campos obrigatórios: name, type_id',
            });
            return;
        }
        const data = await requestWithRetry({
            method: 'POST',
            url: '/activities',
            params: { token },
            data: activityData,
        });
        res.status(201).json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Atualizar activity
app.put('/activities/:id', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { id } = req.params;
        const activityData = req.body;
        const data = await requestWithRetry({
            method: 'PUT',
            url: `/activities/${id}`,
            params: { token },
            data: activityData,
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Deletar activity
app.delete('/activities/:id', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { id } = req.params;
        await requestWithRetry({
            method: 'DELETE',
            url: `/activities/${id}`,
            params: { token },
        });
        res.json({ success: true, message: `Activity ${id} deletada com sucesso` });
    }
    catch (error) {
        handleError(res, error);
    }
});
// ============================================================================
// ROTAS - NOTES
// ============================================================================
// Criar note
app.post('/notes', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const noteData = req.body;
        if (!noteData.text) {
            res.status(400).json({
                success: false,
                error: 'Campo obrigatório: text',
            });
            return;
        }
        if (!noteData.deal_id && !noteData.person_id && !noteData.company_id) {
            res.status(400).json({
                success: false,
                error: 'É necessário informar deal_id, person_id ou company_id',
            });
            return;
        }
        const data = await requestWithRetry({
            method: 'POST',
            url: '/notes',
            params: { token },
            data: noteData,
        });
        res.status(201).json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Deletar note
app.delete('/notes/:id', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { id } = req.params;
        await requestWithRetry({
            method: 'DELETE',
            url: `/notes/${id}`,
            params: { token },
        });
        res.json({ success: true, message: `Note ${id} deletada com sucesso` });
    }
    catch (error) {
        handleError(res, error);
    }
});
// ============================================================================
// ROTAS - PIPELINES & STAGES
// ============================================================================
// Listar pipelines
app.get('/pipelines', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const data = await requestWithRetry({
            method: 'GET',
            url: '/pipelines',
            params: { token },
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// Listar stages
app.get('/stages', authMiddleware, async (req, res) => {
    try {
        const token = req.piperunToken;
        const { pipeline_id } = req.query;
        const params = { token };
        if (pipeline_id)
            params.pipeline_id = Number(pipeline_id);
        const data = await requestWithRetry({
            method: 'GET',
            url: '/stages',
            params,
        });
        res.json(data);
    }
    catch (error) {
        handleError(res, error);
    }
});
// ============================================================================
// ERROR HANDLER
// ============================================================================
function handleError(res, error) {
    if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || error.message;
        res.status(status).json({
            success: false,
            error: message,
            details: error.response?.data,
        });
    }
    else if (error instanceof Error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
    else {
        res.status(500).json({
            success: false,
            error: 'Erro desconhecido',
        });
    }
}
// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
    console.log(`🚀 PipeRun HTTP Server rodando na porta ${PORT}`);
    console.log(`📚 Documentação: http://localhost:${PORT}/`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    console.log('');
    console.log('Autenticação:');
    console.log('  - Header: X-PipeRun-Token: seu_token');
    console.log('  - Query: ?token=seu_token');
    console.log('  - Env: PIPERUN_API_TOKEN');
});
