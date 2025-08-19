// script.js
document.addEventListener('DOMContentLoaded', () => {
    carregarCertidoes();
    popularEmpresas();
    
    document.getElementById('form-empresa').addEventListener('submit', cadastrarEmpresa);
    document.getElementById('form-certidao').addEventListener('submit', cadastrarCertidao);
});

async function carregarCertidoes() {
    try {
        const response = await fetch('http://localhost:3000/dashboard');
        if (!response.ok) {
            throw new Error('Erro ao buscar dados da API');
        }
        const certidoes = await response.json();
        const tbody = document.querySelector('#certidoes-table tbody');
        tbody.innerHTML = '';

        certidoes.forEach(cert => {
            const tr = document.createElement('tr');
            
            let statusClass = 'green';
            let statusText = 'Em Dia';
            if (cert.dias_para_vencer < 1) {
                statusClass = 'red';
                statusText = 'Vencido';
            } else if (cert.dias_para_vencer <= 30) {
                statusClass = 'yellow';
                statusText = 'A Vencer';
            }

            const dataVencimento = new Date(cert.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

            tr.innerHTML = `
                <td>
                    <div class="status ${statusClass}">
                        <span class="status-indicator ${statusClass}"></span>
                        ${statusText}
                    </div>
                </td>
                <td>${cert.certidao_nome}</td>
                <td>${cert.empresa_nome}</td>
                <td>${dataVencimento}</td>
                <td>
                    <button class="btn-renovar" onclick="renovarCertidao(${cert.certidao_id})">
                        Renovar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error('Falha ao carregar certidões:', error);
        alert('Não foi possível carregar os dados. Verifique se o servidor backend está rodando.');
    }
}

async function renovarCertidao(id) {
    const hoje = new Date().toISOString().split('T')[0];
    const confirmacao = confirm(`Deseja renovar esta certidão com a data de hoje (${hoje})?`);

    if (confirmacao) {
        try {
            const response = await fetch(`http://localhost:3000/certidoes/${id}/renovar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nova_data_inicio: hoje }),
            });

            if (!response.ok) {
                throw new Error('Falha ao renovar a certidão.');
            }

            alert('Certidão renovada com sucesso!');
            carregarCertidoes();

        } catch (error) {
            console.error('Erro na renovação:', error);
            alert('Ocorreu um erro ao tentar renovar.');
        }
    }
}

async function popularEmpresas() {
    try {
        const response = await fetch('http://localhost:3000/empresas');
        const empresas = await response.json();
        const select = document.getElementById('empresa-select');
        select.innerHTML = '<option value="">Selecione a Empresa</option>';
        
        empresas.forEach(empresa => {
            const option = document.createElement('option');
            option.value = empresa.id;
            option.textContent = empresa.nome;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao popular empresas:', error);
    }
}

async function cadastrarEmpresa(event) {
    event.preventDefault();
    
    const nome = document.getElementById('empresa-nome').value;
    const cnpj = document.getElementById('empresa-cnpj').value;

    try {
        const response = await fetch('http://localhost:3000/empresas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, cnpj })
        });

        if (!response.ok) throw new Error('Erro ao cadastrar empresa');

        alert('Empresa cadastrada com sucesso!');
        document.getElementById('form-empresa').reset();
        popularEmpresas();
        
    } catch (error) {
        console.error(error);
        alert('Falha no cadastro da empresa.');
    }
}

async function cadastrarCertidao(event) {
    event.preventDefault();

    const certidao = {
        empresa_id: document.getElementById('empresa-select').value,
        nome: document.getElementById('certidao-nome').value,
        data_inicio: document.getElementById('certidao-data-inicio').value,
        validade_dias: document.getElementById('certidao-validade').value
    };

    try {
        const response = await fetch('http://localhost:3000/certidoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(certidao)
        });

        if (!response.ok) throw new Error('Erro ao cadastrar certidão');

        alert('Certidão cadastrada com sucesso!');
        document.getElementById('form-certidao').reset();
        carregarCertidoes();

    } catch (error) {
        console.error(error);
        alert('Falha no cadastro da certidão.');
    }
}