// empresas.js
const API_BASE_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    carregarEmpresas();

    const buscaInput = document.getElementById('busca-empresa');
    buscaInput.addEventListener('keyup', () => filtrarEmpresas(buscaInput.value.toLowerCase()));

    // --- Lógica do Modal ---
    const modal = document.getElementById('modal-edicao');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    closeModalBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
    
    document.getElementById('form-edicao-empresa').addEventListener('submit', salvarEdicaoEmpresa);
});


async function carregarEmpresas() {
    try {
        const response = await fetch(`${API_BASE_URL}/empresas`);
        const empresas = await response.json();
        renderEmpresas(empresas);
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
    }
}

function renderEmpresas(empresas) {
    const container = document.getElementById('lista-empresas');
    container.innerHTML = '';

    if (empresas.length === 0) {
        container.innerHTML = '<p class="placeholder">Nenhuma empresa cadastrada.</p>';
        return;
    }

    empresas.forEach(empresa => {
        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'empresa-item-wrapper';
        itemWrapper.innerHTML = `
            <a href="empresa.html?id=${empresa.id}" class="empresa-item-link">
                <div class="empresa-item">
                    <div class="empresa-info">
                        <h4>${empresa.nome}</h4>
                        <p><strong>Responsável:</strong> ${empresa.dono_empresa || 'Não informado'}</p>
                        <p><strong>CNPJ:</strong> ${empresa.cnpj}</p>
                    </div>
                </div>
            </a>
            <div class="empresa-actions">
                <button class="btn-edit">Editar</button>
                <button class="btn-delete">Excluir</button>
            </div>
        `;
        
        itemWrapper.querySelector('.btn-edit').addEventListener('click', () => abrirModalEdicao(empresa));
        itemWrapper.querySelector('.btn-delete').addEventListener('click', () => excluirEmpresa(empresa.id));

        container.appendChild(itemWrapper);
    });
}

function abrirModalEdicao(empresa) {
    document.getElementById('edit-empresa-id').value = empresa.id;
    document.getElementById('edit-empresa-nome').value = empresa.nome;
    document.getElementById('edit-empresa-dono').value = empresa.dono_empresa;
    document.getElementById('edit-empresa-cnpj').value = empresa.cnpj;
    document.getElementById('modal-edicao').style.display = 'flex';
}

async function salvarEdicaoEmpresa(event) {
    event.preventDefault();
    const id = document.getElementById('edit-empresa-id').value;
    const data = {
        nome: document.getElementById('edit-empresa-nome').value,
        dono_empresa: document.getElementById('edit-empresa-dono').value,
        cnpj: document.getElementById('edit-empresa-cnpj').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/empresas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Falha ao atualizar empresa.');
        
        document.getElementById('modal-edicao').style.display = 'none';
        carregarEmpresas(); // Recarrega a lista para mostrar os dados atualizados
    } catch (error) {
        alert(error.message);
    }
}

async function excluirEmpresa(id) {
    if (!confirm('Tem certeza que deseja excluir esta empresa? Esta ação é permanente e removerá todos os seus dados associados.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/empresas/${id}`, {
            method: 'DELETE'
        });
        if (response.status !== 204) throw new Error('Falha ao excluir a empresa.');
        
        carregarEmpresas(); // Recarrega a lista
    } catch (error) {
        alert(error.message);
    }
}

function filtrarEmpresas(termoBusca) {
    document.querySelectorAll('.empresa-item-wrapper').forEach(item => {
        const textoItem = item.textContent.toLowerCase();
        item.style.display = textoItem.includes(termoBusca) ? 'flex' : 'none';
    });
}