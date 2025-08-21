// configuracoes.js
const API_BASE_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    carregarTiposCertidao();
    document.getElementById('form-tipo-certidao').addEventListener('submit', salvarTipoCertidao);
    document.getElementById('btn-cancelar-edicao').addEventListener('click', resetarFormulario);
});

async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`, options);
        if (response.status === 204) return null;
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Ocorreu um erro na requisição.');
        return data;
    } catch (error) {
        console.error(`Erro em ${endpoint}:`, error);
        alert(error.message);
        return null;
    }
}
async function carregarTiposCertidao() {
    const tipos = await fetchAPI('tipos-certidao');
    if (!tipos) return;
    const container = document.getElementById('lista-tipos-certidao');
    container.innerHTML = '';
    tipos.forEach(tipo => {
        const item = document.createElement('div');
        item.className = 'config-item';
        item.innerHTML = `
            <div class="config-item-info">
                <strong>${tipo.nome}</strong>
                <span>Validade: ${tipo.validade_dias_padrao || 'N/A'} dias</span>
                <p>Requisitos: ${tipo.pre_requisitos || 'Nenhum'}</p>
            </div>
            <div class="config-item-actions">
                <button class="btn-edit">Editar</button>
                <button class="btn-delete">Excluir</button>
            </div>`;
        item.querySelector('.btn-edit').addEventListener('click', () => popularFormularioParaEdicao(tipo));
        item.querySelector('.btn-delete').addEventListener('click', () => deletarTipoCertidao(tipo.id));
        container.appendChild(item);
    });
}

async function salvarTipoCertidao(event) {
    event.preventDefault();
    const id = document.getElementById('tipo-certidao-id').value;
    const tipo = {
        nome: document.getElementById('tipo-certidao-nome').value,
        validade_dias_padrao: document.getElementById('tipo-certidao-validade').value || null,
        pre_requisitos: document.getElementById('tipo-certidao-requisitos').value
    };
    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `tipos-certidao/${id}` : `tipos-certidao`;
    const result = await fetchAPI(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tipo) });
    if (result !== undefined) { resetarFormulario(); carregarTiposCertidao(); }
}

function popularFormularioParaEdicao(tipo) {
    document.getElementById('tipo-certidao-id').value = tipo.id;
    document.getElementById('tipo-certidao-nome').value = tipo.nome;
    document.getElementById('tipo-certidao-validade').value = tipo.validade_dias_padrao;
    document.getElementById('tipo-certidao-requisitos').value = tipo.pre_requisitos;
    document.getElementById('btn-salvar-tipo-certidao').textContent = 'Atualizar';
    document.getElementById('btn-cancelar-edicao').style.display = 'inline-block';
    window.scrollTo(0, 0);
}

async function deletarTipoCertidao(id) {
    if (!confirm('Tem certeza que deseja excluir este tipo?')) return;
    await fetchAPI(`tipos-certidao/${id}`, { method: 'DELETE' });
    carregarTiposCertidao();
}

function resetarFormulario() {
    const form = document.getElementById('form-tipo-certidao');
    form.reset();
    document.getElementById('tipo-certidao-id').value = '';
    document.getElementById('btn-salvar-tipo-certidao').textContent = 'Salvar';
    document.getElementById('btn-cancelar-edicao').style.display = 'none';
}