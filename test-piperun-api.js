// Script para testar a API do PipeRun
const axios = require('axios');

// Token de API fornecido
const API_TOKEN = 'e9c00ac9c6120c6afdbcba7d0db61fa9';

// Configurar instância do Axios
const PIPERUN_API_BASE_URL = "https://api.pipe.run/v1";
const axiosInstance = axios.create({
  baseURL: PIPERUN_API_BASE_URL,
  headers: {
    'token': `${API_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Função para listar oportunidades
async function listDeals() {
  try {
    console.log('Tentando listar oportunidades...');
    const response = await axiosInstance.get('/deals', { 
      params: { 
        page: 1, 
        limit: 5 
      } 
    });
    console.log('Sucesso! Oportunidades encontradas:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Erro ao listar oportunidades:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Dados:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

// Função para criar uma pessoa
async function createPerson() {
  try {
    console.log('Tentando criar uma pessoa...');
    const personData = {
      name: 'Teste MCP',
      owner_id: 34974, // ID do usuário responsável obtido das oportunidades listadas
      email: 'teste@exemplo.com',
      phone: '11999999999'
    };
    
    const response = await axiosInstance.post('/persons', personData);
    console.log('Sucesso! Pessoa criada:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Erro ao criar pessoa:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Dados:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

// Executar os testes
async function runTests() {
  try {
    // Testar listagem de oportunidades
    await listDeals();
    
    // Testar criação de pessoa
    console.log('\nAgora vamos testar a criação de uma pessoa...');
    await createPerson();
    
    console.log('Testes concluídos com sucesso!');
  } catch (error) {
    console.error('Falha nos testes.');
  }
}

// Executar os testes
runTests();