// empresa.js
const API_BASE_URL = 'http://localhost:3000/api';
let empresaId; // Variável global para guardar o ID da empresa na página

// --- FUNÇÃO DE INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    empresaId = params.get('id');

    if (empresaId) {
        carregarPerfilCompleto(empresaId);
    } else {
        document.body.innerHTML = '<h1>Erro: ID da empresa não fornecido.</h1><a href="empresas.html">Voltar para a lista</a>';
    }

    // Adiciona os "escutadores" de eventos para os formulários
    document.getElementById('form-anotacao').addEventListener('submit', salvarAnotacao);
    document.getElementById('form-debito').addEventListener('submit', salvarDebito);
});

// --- FUNÇÃO GENÉRICA PARA CHAMADAS DE API ---
async function fetchAPI(endpoint, options = {}) {
    try {
        const finalEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${API_BASE_URL}${finalEndpoint}`;
        
        const response = await fetch(url, options);
        if (response.status === 204) return null; // Retorno para DELETE bem-sucedido
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Ocorreu um erro na requisição para ${endpoint}`);
        }
        return data;
    } catch (error) {
        console.error(`Erro em ${endpoint}:`, error);
        alert(error.message);
        return null;
    }
}

// --- FUNÇÕES DE CARREGAMENTO E RENDERIZAÇÃO ---
async function carregarPerfilCompleto(id) {
    // Carrega todos os dados da página em paralelo para mais eficiência
    const [empresa, anotacoes, debitos] = await Promise.all([
        fetchAPI(`empresas/${id}`),
        fetchAPI(`empresas/${id}/anotacoes`),
        fetchAPI(`empresas/${id}/debitos`)
    ]);

    if (!empresa) {
        document.querySelector('.main-content').innerHTML = `<h1>Erro ao carregar dados da empresa.</h1>`;
        return;
    }

    // Popula o cabeçalho da página
    document.getElementById('nome-empresa').textContent = empresa.nome;
    document.getElementById('cnpj-empresa').textContent = `CNPJ: ${empresa.cnpj}`;
    document.title = `Perfil: ${empresa.nome}`;

    if (anotacoes) renderAnotacoes(anotacoes);
    if (debitos) renderDebitos(debitos);
}

function renderAnotacoes(anotacoes) {
    const container = document.getElementById('anotacoes-list');
    container.innerHTML = '';

    if (anotacoes.length === 0) {
        container.innerHTML = '<p class="placeholder">Nenhuma anotação para esta empresa ainda.</p>';
        return;
    }

    anotacoes.forEach(anotacao => {
        const item = document.createElement('div');
        item.className = 'anotacao-item';
        const data = new Date(anotacao.criado_em).toLocaleString('pt-BR');

        item.innerHTML = `
            <div class="anotacao-header">
                <span class="anotacao-autor">Por: <strong>${anotacao.autor || 'Admin'}</strong></span>
                <span class="anotacao-data">${data}</span>
            </div>
            <p class="anotacao-conteudo">${anotacao.conteudo}</p>
        `;
        container.appendChild(item);
    });
}

function renderDebitos(debitos) {
    const container = document.getElementById('lista-debitos');
    container.innerHTML = '';

    if (debitos.length === 0) {
        container.innerHTML = '<p class="placeholder">Nenhum débito cadastrado para esta empresa.</p>';
        return;
    }

    debitos.forEach(debito => {
        const item = document.createElement('div');
        item.className = `debito-item ${debito.status.toLowerCase()}`;
        const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(debito.valor);
        const dataVencimento = new Date(debito.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

        item.innerHTML = `
            <div class="debito-info">
                <h4>${debito.nome}</h4>
                <p>Valor: ${valorFormatado} | Vencimento: ${dataVencimento}</p>
            </div>
            <div class="debito-status">Status: <strong>${debito.status}</strong></div>
            <div class="debito-actions">
                ${debito.status === 'Ativo' ? `<button class="btn-regularizar">Regularizar</button>` : ''}
                <button class="btn-edit">Editar</button>
                <button class="btn-delete">Excluir</button>
            </div>
        `;
        
        const btnRegularizar = item.querySelector('.btn-regularizar');
        if(btnRegularizar) btnRegularizar.addEventListener('click', () => regularizarDebito(debito.id));
        
        item.querySelector('.btn-edit').addEventListener('click', () => popularFormularioDebito(debito));
        item.querySelector('.btn-delete').addEventListener('click', () => excluirDebito(debito.id));
        
        container.appendChild(item);
    });
}


// --- AÇÕES DE ANOTAÇÕES ---
async function salvarAnotacao(event) {
    event.preventDefault();
    const textarea = document.getElementById('conteudo-anotacao');
    const conteudo = textarea.value;

    if (!conteudo.trim()) {
        alert('Por favor, escreva algo na anotação.');
        return;
    }

    const result = await fetchAPI(`empresas/${empresaId}/anotacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo: conteudo, autor: 'Admin' })
    });

    if (result) {
        textarea.value = '';
        carregarPerfilCompleto(empresaId); // Recarrega tudo para manter a consistência
    }
}


// --- AÇÕES DE DÉBITOS ---
async function salvarDebito(event) {
    event.preventDefault();
    const id = document.getElementById('debito-id').value;
    const data = {
        empresa_id: empresaId,
        nome: document.getElementById('debito-nome').value,
        valor: document.getElementById('debito-valor').value,
        data_vencimento: document.getElementById('debito-vencimento').value,
    };
    
    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `debitos/${id}` : `debitos`;
    
    const result = await fetchAPI(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    
    if (result !== null) { // Checa se não foi um erro
        document.getElementById('form-debito').reset();
        document.getElementById('debito-id').value = '';
        document.getElementById('btn-salvar-debito').textContent = 'Adicionar Débito';
        carregarPerfilCompleto(empresaId);
    }
}

function popularFormularioDebito(debito) {
    document.getElementById('debito-id').value = debito.id;
    document.getElementById('debito-nome').value = debito.nome;
    document.getElementById('debito-valor').value = debito.valor;
    // Formata a data corretamente para o input type="date"
    document.getElementById('debito-vencimento').value = new Date(debito.data_vencimento).toISOString().split('T')[0];
    document.getElementById('btn-salvar-debito').textContent = 'Atualizar Débito';
    // Rola a página para o formulário para facilitar a edição
    document.getElementById('form-debito').scrollIntoView({ behavior: 'smooth' });
}

async function excluirDebito(id) {
    if (!confirm('Tem certeza que deseja excluir este débito permanentemente?')) return;
    await fetchAPI(`debitos/${id}`, { method: 'DELETE' });
    carregarPerfilCompleto(empresaId); // Recarrega para refletir a exclusão
}

async function regularizarDebito(id) {
    if (!confirm('Confirmar a regularização deste débito?')) return;
    await fetchAPI(`debitos/${id}/regularizar`, { method: 'POST' });
    carregarPerfilCompleto(empresaId); // Recarrega para refletir a mudança de status
}