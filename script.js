// script.js
const API_BASE_URL = 'http://localhost:3000/api';

// --- FUNÇÃO DE INICIALIZAÇÃO ---
// Esta função é chamada quando qualquer página carrega
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se estamos na página do Dashboard antes de carregar os dados dele
    if (document.getElementById('fluxo-tarefas-list')) {
        carregarDashboard();
    }

    // Adiciona o listener para o formulário de empresa APENAS se ele existir na página
    const formEmpresa = document.getElementById('form-empresa');
    if (formEmpresa) {
        formEmpresa.addEventListener('submit', cadastrarEmpresa);
    }
    
    // Adiciona o listener para o formulário de certidão APENAS se ele existir
    const formCertidao = document.getElementById('form-certidao');
    if (formCertidao) {
        formCertidao.addEventListener('submit', cadastrarCertidao);
    }

    // Adiciona o listener para o toggle de certidão avulsa APENAS se ele existir
    const avulsaToggle = document.getElementById('avulsa-toggle');
    if (avulsaToggle) {
        avulsaToggle.addEventListener('change', toggleCertidaoAvulsa);
    }
});


// --- FUNÇÃO CENTRAL DO DASHBOARD ---
function carregarDashboard() {
    carregarSaudeEmpresas();
    carregarFluxoTarefas();
    popularEmpresasParaFormulario();
    popularTiposCertidaoParaFormulario();
}

// --- FUNÇÃO GENÉRICA PARA CHAMADAS DE API ---
async function fetchAPI(endpoint, options = {}) {
    try {
        // Ajusta o endpoint para funcionar corretamente com ou sem / inicial
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


// --- FUNÇÕES DE CARREGAMENTO DE COMPONENTES ---
async function carregarFluxoTarefas() {
    const tarefas = await fetchAPI('../dashboard/fluxo-tarefas');
    if (!tarefas) return;
    
    const container = document.getElementById('fluxo-tarefas-list');
    container.innerHTML = '';
    
    tarefas.forEach(tarefa => {
        const item = document.createElement('div');
        item.className = 'task-item';
        let diasClasse = 'sucesso';
        let diasTexto = `${tarefa.dias_restantes} dias`;
        if (tarefa.dias_restantes < 1) { diasClasse = 'vencido'; diasTexto = `Vencido`; }
        else if (tarefa.dias_restantes <= 30) { diasClasse = 'alerta'; }
        const dataVencimento = new Date(tarefa.vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        
        item.innerHTML = `
            <div class="task-info"><h4>${tarefa.nome}</h4><p>${tarefa.tipo} • ${tarefa.empresa_nome}</p></div>
            <div class="task-due"><span class="days ${diasClasse}">${diasTexto}</span><p class="date">${dataVencimento}</p></div>
            <div class="task-actions">
                <button onclick="renovarCertidao(${tarefa.id})">Renovar</button>
                <button onclick="excluirCertidao(${tarefa.id})" class="btn-delete">Excluir</button>
            </div>`;
        container.appendChild(item);
    });
}

async function carregarSaudeEmpresas() {
    const empresas = await fetchAPI('../dashboard/saude-empresas');
    if(!empresas) return;

    const container = document.getElementById('saude-empresas-list');
    container.innerHTML = '';

    empresas.forEach(empresa => {
        const link = document.createElement('a');
        link.href = `empresa.html?id=${empresa.id}`;
        link.className = 'saude-item-link';
        let badgesHTML = '';
        if (empresa.vencidos > 0) badgesHTML += `<span class="badge badge-vencido">${empresa.vencidos}</span>`;
        if (empresa.a_vencer > 0) badgesHTML += `<span class="badge badge-alerta">${empresa.a_vencer}</span>`;
        
        link.innerHTML = `
            <div class="saude-item">
                <div class="saude-info"><h4>${empresa.nome}</h4><p>${empresa.dono_empresa || ''}</p></div>
                <div class="badges">${badgesHTML || ''}</div>
            </div>`;
            
        link.addEventListener('click', (e) => {
            e.preventDefault();
            carregarUrgencias(empresa.id);
            document.querySelectorAll('.saude-item.active').forEach(el => el.classList.remove('active'));
            link.querySelector('.saude-item').classList.add('active');
        });
        container.appendChild(link);
    });
}

async function carregarUrgencias(empresaId) {
    const urgencias = await fetchAPI(`empresas/${empresaId}/urgencias`);
    if(!urgencias) return;

    const container = document.getElementById('urgencias-list');
    container.innerHTML = '';
    if (urgencias.length === 0) {
        container.innerHTML = '<p class="placeholder">Nenhuma urgência para esta empresa.</p>';
        return;
    }

    urgencias.forEach(item => {
        const urgenciaItem = document.createElement('div');
        urgenciaItem.className = 'task-item';
        let diasClasse = 'sucesso';
        let diasTexto = `${item.dias_restantes} dias`;
        if (item.dias_restantes < 1) { diasClasse = 'vencido'; diasTexto = `Vencido`; }
        else if (item.dias_restantes <= 30) { diasClasse = 'alerta'; }
        const dataVencimento = new Date(item.vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

        urgenciaItem.innerHTML = `
            <div class="task-info"><h4>${item.nome}</h4></div>
            <div class="task-due"><span class="days ${diasClasse}">${diasTexto}</span><p class="date">${dataVencimento}</p></div>`;
        container.appendChild(urgenciaItem);
    });
}


// --- FUNÇÕES DE CADASTRO E AÇÕES ---
async function cadastrarEmpresa(event) {
    event.preventDefault();
    const data = {
        nome: document.getElementById('empresa-nome').value,
        dono_empresa: document.getElementById('empresa-dono').value,
        cnpj: document.getElementById('empresa-cnpj').value,
    };
    const result = await fetchAPI('empresas', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    if (result) { alert('Empresa cadastrada com sucesso!'); event.target.reset(); carregarDashboard(); }
}

function toggleCertidaoAvulsa() {
    const isChecked = document.getElementById('avulsa-toggle').checked;
    document.getElementById('campos-tipo-existente').style.display = isChecked ? 'none' : 'grid';
    document.getElementById('campos-certidao-avulsa').style.display = isChecked ? 'grid' : 'none';
}

async function cadastrarCertidao(event) {
    event.preventDefault();
    const isAvulsa = document.getElementById('avulsa-toggle').checked;
    let certidao = {
        empresa_id: document.getElementById('empresa-select').value,
        data_inicio: document.getElementById('certidao-data-inicio').value,
    };

    if (isAvulsa) {
        certidao.nome_personalizado = document.getElementById('certidao-nome-avulsa').value;
        certidao.validade_dias_personalizada = document.getElementById('certidao-validade-avulsa').value;
    } else {
        certidao.tipo_certidao_id = document.getElementById('certidao-tipo-select').value;
    }

    const result = await fetchAPI('certidoes', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(certidao) });
    if (result) { alert('Certidão cadastrada com sucesso!'); event.target.reset(); carregarDashboard(); }
}

async function renovarCertidao(id) {
    const hoje = new Date().toISOString().split('T')[0];
    if (confirm(`Deseja renovar esta certidão, definindo a data de início como hoje (${hoje})?`)) {
        const result = await fetchAPI(`certidoes/${id}/renovar`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ nova_data_inicio: hoje }) });
        if (result) { alert(result.message); carregarDashboard(); }
    }
}

async function excluirCertidao(id) {
    if (confirm('Tem certeza que deseja excluir esta certidão permanentemente?')) {
        await fetchAPI(`certidoes/${id}`, { method: 'DELETE' });
        alert('Certidão excluída com sucesso.');
        carregarDashboard();
    }
}


// --- FUNÇÕES AUXILIARES PARA POPULAR FORMULÁRIOS ---
async function popularEmpresasParaFormulario() {
    const select = document.getElementById('empresa-select');
    if (!select) return; // <-- VERIFICAÇÃO ADICIONADA

    const empresas = await fetchAPI('empresas');
    if(!empresas) return;
    
    select.innerHTML = '<option value="">Selecione a Empresa</option>';
    empresas.forEach(empresa => {
        select.innerHTML += `<option value="${empresa.id}">${empresa.nome}</option>`;
    });
}

async function popularTiposCertidaoParaFormulario() {
    const select = document.getElementById('certidao-tipo-select');
    if (!select) return; // <-- VERIFICAÇÃO ADICIONADA

    const tipos = await fetchAPI('tipos-certidao');
    if(!tipos) return;

    select.innerHTML = '<option value="">Selecione o Tipo</option>';
    tipos.forEach(tipo => {
        select.innerHTML += `<option value="${tipo.id}">${tipo.nome}</option>`;
    });
}