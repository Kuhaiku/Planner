// script.js
document.addEventListener('DOMContentLoaded', () => {
    carregarCertidoes();
});

async function carregarCertidoes() {
    try {
        const response = await fetch('http://localhost:3000/dashboard');
        if (!response.ok) {
            throw new Error('Erro ao buscar dados da API');
        }
        const certidoes = await response.json();
        const tbody = document.querySelector('#certidoes-table tbody');
        tbody.innerHTML = ''; // Limpa a tabela antes de preencher

        certidoes.forEach(cert => {
            const tr = document.createElement('tr');
            
            // Lógica de Status
            let statusClass = 'green';
            let statusText = 'Em Dia';
            if (cert.dias_para_vencer < 1) {
                statusClass = 'red';
                statusText = 'Vencido';
            } else if (cert.dias_para_vencer <= 30) {
                statusClass = 'yellow';
                statusText = 'A Vencer';
            }

            // Formatar data para o padrão brasileiro
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
    const hoje = new Date().toISOString().split('T')[0]; // Pega a data de hoje no formato YYYY-MM-DD
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
            carregarCertidoes(); // Recarrega a lista para mostrar o novo vencimento

        } catch (error) {
            console.error('Erro na renovação:', error);
            alert('Ocorreu um erro ao tentar renovar.');
        }
    }
}