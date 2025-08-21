// server.js
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());


// --- ROTAS DE CONFIGURAÇÃO (Schemas de Certidão) ---
app.get('/api/tipos-certidao', async (req, res) => { try { const [rows] = await pool.query('SELECT * FROM tipos_certidao ORDER BY nome'); res.json(rows); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/tipos-certidao', async (req, res) => { try { const { nome, validade_dias_padrao, pre_requisitos } = req.body; const [result] = await pool.query('INSERT INTO tipos_certidao (nome, validade_dias_padrao, pre_requisitos) VALUES (?, ?, ?)', [nome, validade_dias_padrao, pre_requisitos]); res.status(201).json({ id: result.insertId, ...req.body }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.put('/api/tipos-certidao/:id', async (req, res) => { try { const { id } = req.params; const { nome, validade_dias_padrao, pre_requisitos } = req.body; await pool.query('UPDATE tipos_certidao SET nome = ?, validade_dias_padrao = ?, pre_requisitos = ? WHERE id = ?', [nome, validade_dias_padrao, pre_requisitos, id]); res.json({ message: 'Atualizado com sucesso.' }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.delete('/api/tipos-certidao/:id', async (req, res) => { try { const { id } = req.params; await pool.query('DELETE FROM tipos_certidao WHERE id = ?', [id]); res.status(204).send(); } catch (e) { if (e.code === 'ER_ROW_IS_REFERENCED_2') { return res.status(400).json({ error: 'Este tipo não pode ser excluído pois está em uso.' }); } res.status(500).json({ error: e.message }); } });


// --- ROTAS DE EMPRESAS (CRUD COMPLETO) ---
app.post('/api/empresas', async (req, res) => { try { const { nome, dono_empresa, cnpj } = req.body; const [result] = await pool.query('INSERT INTO empresas (nome, dono_empresa, cnpj) VALUES (?, ?, ?)', [nome, dono_empresa, cnpj]); res.status(201).json({ id: result.insertId, ...req.body }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/empresas', async (req, res) => { try { const [rows] = await pool.query('SELECT * FROM empresas ORDER BY nome ASC'); res.json(rows); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/empresas/:id', async (req, res) => { try { const { id } = req.params; const [rows] = await pool.query('SELECT * FROM empresas WHERE id = ?', [id]); if (rows.length === 0) return res.status(404).json({ error: 'Empresa não encontrada' }); res.json(rows[0]); } catch (e) { res.status(500).json({ error: e.message }); } });
app.put('/api/empresas/:id', async (req, res) => { try { const { id } = req.params; const { nome, dono_empresa, cnpj } = req.body; await pool.query('UPDATE empresas SET nome = ?, dono_empresa = ?, cnpj = ? WHERE id = ?', [nome, dono_empresa, cnpj, id]); res.json({ message: 'Empresa atualizada com sucesso.' }); } catch (error) { res.status(500).json({ error: error.message }); } });
app.delete('/api/empresas/:id', async (req, res) => { try { const { id } = req.params; await pool.query('DELETE FROM empresas WHERE id = ?', [id]); res.status(204).send(); } catch (error) { res.status(500).json({ error: error.message }); } });


// --- ROTAS DE ANOTAÇÕES ---
app.get('/api/empresas/:id/anotacoes', async (req, res) => { try { const { id } = req.params; const [anotacoes] = await pool.query('SELECT * FROM anotacoes WHERE empresa_id = ? ORDER BY criado_em DESC', [id]); res.json(anotacoes); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/empresas/:id/anotacoes', async (req, res) => { try { const { id } = req.params; const { conteudo, autor } = req.body; if (!conteudo) return res.status(400).json({ error: 'Conteúdo obrigatório.' }); const [result] = await pool.query('INSERT INTO anotacoes (empresa_id, conteudo, autor) VALUES (?, ?, ?)', [id, conteudo, autor || 'Admin']); res.status(201).json({ id: result.insertId }); } catch (e) { res.status(500).json({ error: e.message }); } });


// --- ROTAS DE CERTIDÕES ---
app.post('/api/certidoes', async (req, res) => {
    const { empresa_id, data_inicio, tipo_certidao_id, nome_personalizado, validade_dias_personalizada } = req.body;
    try {
        let query, params;
        if (tipo_certidao_id) {
            query = 'INSERT INTO certidoes (empresa_id, data_inicio, tipo_certidao_id) VALUES (?, ?, ?)';
            params = [empresa_id, data_inicio, tipo_certidao_id];
        } else {
            query = 'INSERT INTO certidoes (empresa_id, data_inicio, nome_personalizado, validade_dias_personalizada) VALUES (?, ?, ?, ?)';
            params = [empresa_id, data_inicio, nome_personalizado, validade_dias_personalizada];
        }
        const [result] = await pool.query(query, params);
        res.status(201).json({ id: result.insertId, message: 'Certidão criada com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.delete('/api/certidoes/:id', async (req, res) => { try { const { id } = req.params; await pool.query('DELETE FROM certidoes WHERE id = ?', [id]); res.status(204).send(); } catch (error) { res.status(500).json({ error: error.message }); } });
app.post('/api/certidoes/:id/renovar', async (req, res) => { try { const { id } = req.params; const { nova_data_inicio } = req.body; await pool.query('UPDATE certidoes SET data_inicio = ? WHERE id = ?', [nova_data_inicio, id]); res.json({ message: 'Certidão renovada com sucesso.' }); } catch (error) { res.status(500).json({ error: error.message }); } });


// --- ROTAS DE DÉBITOS (CRUD COMPLETO) ---
app.get('/api/empresas/:id/debitos', async (req, res) => { try { const { id } = req.params; const query = 'SELECT * FROM debitos WHERE empresa_id = ? ORDER BY data_vencimento ASC'; const [debitos] = await pool.query(query, [id]); res.json(debitos); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/debitos', async (req, res) => { try { const { empresa_id, nome, valor, data_vencimento } = req.body; const query = 'INSERT INTO debitos (empresa_id, nome, valor, data_vencimento, status) VALUES (?, ?, ?, ?, "Ativo")'; const [result] = await pool.query(query, [empresa_id, nome, valor, data_vencimento]); res.status(201).json({ id: result.insertId, ...req.body }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.put('/api/debitos/:id', async (req, res) => { try { const { id } = req.params; const { nome, valor, data_vencimento } = req.body; const query = 'UPDATE debitos SET nome = ?, valor = ?, data_vencimento = ? WHERE id = ?'; await pool.query(query, [nome, valor, data_vencimento, id]); res.json({ message: 'Débito atualizado com sucesso.' }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.delete('/api/debitos/:id', async (req, res) => { try { const { id } = req.params; await pool.query('DELETE FROM debitos WHERE id = ?', [id]); res.status(204).send(); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/debitos/:id/regularizar', async (req, res) => { try { const { id } = req.params; await pool.query('UPDATE debitos SET status = "Regularizado" WHERE id = ?', [id]); res.json({ message: 'Débito regularizado com sucesso.' }); } catch (e) { res.status(500).json({ error: e.message }); } });


// --- ROTAS DO DASHBOARD E CONSULTAS COMPLEXAS ---
const getTarefasQuery = (empresaId = null) => `
    SELECT 'Certidão' as tipo, c.id, e.nome as empresa_nome,
        COALESCE(tc.nome, c.nome_personalizado) as nome,
        DATE_ADD(c.data_inicio, INTERVAL COALESCE(tc.validade_dias_padrao, c.validade_dias_personalizada) DAY) as vencimento,
        DATEDIFF(DATE_ADD(c.data_inicio, INTERVAL COALESCE(tc.validade_dias_padrao, c.validade_dias_personalizada) DAY), CURDATE()) as dias_restantes
    FROM certidoes c
    JOIN empresas e ON c.empresa_id = e.id
    LEFT JOIN tipos_certidao tc ON c.tipo_certidao_id = tc.id
    ${empresaId ? 'WHERE c.empresa_id = ?' : ''}
`;
app.get('/dashboard/fluxo-tarefas', async (req, res) => {
    try {
        const [certidoes] = await pool.query(getTarefasQuery());
        // Aqui faremos o UNION com os débitos
        const [debitos] = await pool.query(`SELECT 'Débito' as tipo, id, (SELECT nome FROM empresas WHERE id = empresa_id) as empresa_nome, nome, data_vencimento as vencimento, DATEDIFF(data_vencimento, CURDATE()) as dias_restantes FROM debitos WHERE status = 'Ativo'`);
        const todasTarefas = [...certidoes, ...debitos];
        todasTarefas.sort((a, b) => a.dias_restantes - b.dias_restantes);
        res.json(todasTarefas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/empresas/:id/urgencias', async (req, res) => {
    try {
        const { id } = req.params;
        const [certidoes] = await pool.query(getTarefasQuery(id), [id]);
        const [debitos] = await pool.query(`SELECT 'Débito' as tipo, id, nome, data_vencimento as vencimento, DATEDIFF(data_vencimento, CURDATE()) as dias_restantes FROM debitos WHERE status = 'Ativo' AND empresa_id = ?`, [id]);
        const todasUrgencias = [...certidoes, ...debitos];
        todasUrgencias.sort((a, b) => a.dias_restantes - b.dias_restantes);
        res.json(todasUrgencias);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/dashboard/saude-empresas', async (req, res) => { 
    try {
        const query = `
            SELECT
                e.id, e.nome, e.dono_empresa,
                (SELECT COUNT(*) FROM certidoes c LEFT JOIN tipos_certidao tc ON c.tipo_certidao_id = tc.id WHERE c.empresa_id = e.id AND DATEDIFF(DATE_ADD(c.data_inicio, INTERVAL COALESCE(tc.validade_dias_padrao, c.validade_dias_personalizada) DAY), CURDATE()) < 1) +
                (SELECT COUNT(*) FROM debitos d WHERE d.empresa_id = e.id AND d.status = 'Ativo' AND DATEDIFF(d.data_vencimento, CURDATE()) < 1) AS vencidos,
                
                (SELECT COUNT(*) FROM certidoes c LEFT JOIN tipos_certidao tc ON c.tipo_certidao_id = tc.id WHERE c.empresa_id = e.id AND DATEDIFF(DATE_ADD(c.data_inicio, INTERVAL COALESCE(tc.validade_dias_padrao, c.validade_dias_personalizada) DAY), CURDATE()) BETWEEN 1 AND 30) +
                (SELECT COUNT(*) FROM debitos d WHERE d.empresa_id = e.id AND d.status = 'Ativo' AND DATEDIFF(d.data_vencimento, CURDATE()) BETWEEN 1 AND 30) AS a_vencer
            FROM empresas e
            GROUP BY e.id, e.nome, e.dono_empresa
            ORDER BY vencidos DESC, a_vencer DESC, e.nome;
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});