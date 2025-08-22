// server.js
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
// Este middleware atua como um "guarda" para as rotas.
// Ele verifica o token JWT enviado pelo front-end para garantir que a requisição é autenticada.
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato esperado: "Bearer TOKEN"

    if (token == null) {
        return res.sendStatus(401); // 401 Unauthorized: Nenhum token fornecido.
    }

    // Use uma variável de ambiente para o segredo em um projeto real!
    const JWT_SECRET = process.env.JWT_SECRET || 'SEU_SEGREDO_SUPER_SECRETO';

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // 403 Forbidden: Token inválido ou expirado.
        }
        req.user = user; // Anexa os dados do usuário (ex: id, email) ao objeto da requisição.
        next(); // Continua para a execução da rota.
    });
};


// --- ROTAS DE AUTENTICAÇÃO (Públicas) ---

// Rota de Registro de novo usuário (administradora)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
        }
        const hashedPassword = await bcrypt.hash(senha, 10);
        const [result] = await pool.query(
            'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
            [nome, email, hashedPassword]
        );
        res.status(201).json({ id: result.insertId, message: "Usuário criado com sucesso!" });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "Este e-mail já está em uso." });
        }
        res.status(500).json({ error: e.message });
    }
});

// Rota de Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ error: "E-mail ou senha inválidos." });
        }
        const user = rows[0];
        const isMatch = await bcrypt.compare(senha, user.senha);
        if (!isMatch) {
            return res.status(401).json({ error: "E-mail ou senha inválidos." });
        }
        const JWT_SECRET = process.env.JWT_SECRET || 'SEU_SEGREDO_SUPER_SECRETO';
        const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ accessToken, userName: user.nome });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// --- ROTAS PROTEGIDAS PELA AUTENTICAÇÃO ---

// --- ROTAS DE CONFIGURAÇÃO (Schemas de Certidão) ---
app.get('/api/tipos-certidao', authenticateToken, async (req, res) => { try { const [rows] = await pool.query('SELECT * FROM tipos_certidao ORDER BY nome'); res.json(rows); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/tipos-certidao', authenticateToken, async (req, res) => { try { const { nome, validade_dias_padrao, pre_requisitos } = req.body; const [result] = await pool.query('INSERT INTO tipos_certidao (nome, validade_dias_padrao, pre_requisitos) VALUES (?, ?, ?)', [nome, validade_dias_padrao, pre_requisitos]); res.status(201).json({ id: result.insertId, ...req.body }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.put('/api/tipos-certidao/:id', authenticateToken, async (req, res) => { try { const { id } = req.params; const { nome, validade_dias_padrao, pre_requisitos } = req.body; await pool.query('UPDATE tipos_certidao SET nome = ?, validade_dias_padrao = ?, pre_requisitos = ? WHERE id = ?', [nome, validade_dias_padrao, pre_requisitos, id]); res.json({ message: 'Atualizado com sucesso.' }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.delete('/api/tipos-certidao/:id', authenticateToken, async (req, res) => { try { const { id } = req.params; await pool.query('DELETE FROM tipos_certidao WHERE id = ?', [id]); res.status(204).send(); } catch (e) { if (e.code === 'ER_ROW_IS_REFERENCED_2') { return res.status(400).json({ error: 'Este tipo não pode ser excluído pois está em uso.' }); } res.status(500).json({ error: e.message }); } });


// --- ROTAS DE EMPRESAS (CRUD COMPLETO) ---
app.post('/api/empresas', authenticateToken, async (req, res) => { try { const { nome, dono_empresa, cnpj } = req.body; const usuario_id = req.user.id; const [result] = await pool.query('INSERT INTO empresas (nome, dono_empresa, cnpj, usuario_id) VALUES (?, ?, ?, ?)', [nome, dono_empresa, cnpj, usuario_id]); res.status(201).json({ id: result.insertId, ...req.body }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/empresas', authenticateToken, async (req, res) => { try { const usuario_id = req.user.id; const [rows] = await pool.query('SELECT * FROM empresas WHERE usuario_id = ? ORDER BY nome ASC', [usuario_id]); res.json(rows); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/empresas/:id', authenticateToken, async (req, res) => { try { const { id } = req.params; const usuario_id = req.user.id; const [rows] = await pool.query('SELECT * FROM empresas WHERE id = ? AND usuario_id = ?', [id, usuario_id]); if (rows.length === 0) return res.status(404).json({ error: 'Empresa não encontrada ou não pertence a você' }); res.json(rows[0]); } catch (e) { res.status(500).json({ error: e.message }); } });
app.put('/api/empresas/:id', authenticateToken, async (req, res) => { try { const { id } = req.params; const usuario_id = req.user.id; const { nome, dono_empresa, cnpj } = req.body; const [result] = await pool.query('UPDATE empresas SET nome = ?, dono_empresa = ?, cnpj = ? WHERE id = ? AND usuario_id = ?', [nome, dono_empresa, cnpj, id, usuario_id]); if (result.affectedRows === 0) return res.status(404).json({ error: 'Empresa não encontrada ou não pertence a você.' }); res.json({ message: 'Empresa atualizada com sucesso.' }); } catch (error) { res.status(500).json({ error: error.message }); } });
app.delete('/api/empresas/:id', authenticateToken, async (req, res) => { try { const { id } = req.params; const usuario_id = req.user.id; const [result] = await pool.query('DELETE FROM empresas WHERE id = ? AND usuario_id = ?', [id, usuario_id]); if (result.affectedRows === 0) return res.status(404).json({ error: 'Empresa não encontrada ou não pertence a você.' }); res.status(204).send(); } catch (error) { res.status(500).json({ error: error.message }); } });


// --- ROTAS DE ANOTAÇÕES ---
app.get('/api/empresas/:id/anotacoes', authenticateToken, async (req, res) => { try { const { id } = req.params; const usuario_id = req.user.id; const [empresa] = await pool.query('SELECT id FROM empresas WHERE id = ? AND usuario_id = ?', [id, usuario_id]); if (empresa.length === 0) return res.status(404).json({ error: 'Empresa não encontrada ou não pertence a você.' }); const [anotacoes] = await pool.query('SELECT * FROM anotacoes WHERE empresa_id = ? ORDER BY criado_em DESC', [id]); res.json(anotacoes); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/empresas/:id/anotacoes', authenticateToken, async (req, res) => { try { const { id } = req.params; const usuario_id = req.user.id; const { conteudo, autor } = req.body; if (!conteudo) return res.status(400).json({ error: 'Conteúdo obrigatório.' }); const [empresa] = await pool.query('SELECT id FROM empresas WHERE id = ? AND usuario_id = ?', [id, usuario_id]); if (empresa.length === 0) return res.status(404).json({ error: 'Empresa não encontrada ou não pertence a você.' }); const [result] = await pool.query('INSERT INTO anotacoes (empresa_id, conteudo, autor) VALUES (?, ?, ?)', [id, conteudo, autor || 'Admin']); res.status(201).json({ id: result.insertId }); } catch (e) { res.status(500).json({ error: e.message }); } });


// --- ROTAS DE CERTIDÕES ---
app.post('/api/certidoes', authenticateToken, async (req, res) => {
    try {
        const { empresa_id, data_inicio, tipo_certidao_id, nome_personalizado, validade_dias_personalizada } = req.body;
        const usuario_id = req.user.id;
        const [empresa] = await pool.query('SELECT id FROM empresas WHERE id = ? AND usuario_id = ?', [empresa_id, usuario_id]);
        if (empresa.length === 0) return res.status(404).json({ error: 'Empresa não encontrada ou não pertence a você.' });
        
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
app.delete('/api/certidoes/:id', authenticateToken, async (req, res) => { try { const { id } = req.params; const usuario_id = req.user.id; const [result] = await pool.query('DELETE c FROM certidoes c JOIN empresas e ON c.empresa_id = e.id WHERE c.id = ? AND e.usuario_id = ?', [id, usuario_id]); if (result.affectedRows === 0) return res.status(404).json({ error: 'Certidão não encontrada ou não pertence a você.' }); res.status(204).send(); } catch (error) { res.status(500).json({ error: error.message }); } });
app.post('/api/certidoes/:id/renovar', authenticateToken, async (req, res) => { try { const { id } = req.params; const usuario_id = req.user.id; const { nova_data_inicio } = req.body; const [result] = await pool.query('UPDATE certidoes c JOIN empresas e ON c.empresa_id = e.id SET c.data_inicio = ? WHERE c.id = ? AND e.usuario_id = ?', [nova_data_inicio, id, usuario_id]); if (result.affectedRows === 0) return res.status(404).json({ error: 'Certidão não encontrada ou não pertence a você.' }); res.json({ message: 'Certidão renovada com sucesso.' }); } catch (error) { res.status(500).json({ error: error.message }); } });


// --- ROTAS DE DÉBITOS (CRUD COMPLETO) ---
app.get('/api/empresas/:id/debitos', authenticateToken, async (req, res) => { try { const { id } = req.params; const usuario_id = req.user.id; const [empresa] = await pool.query('SELECT id FROM empresas WHERE id = ? AND usuario_id = ?', [id, usuario_id]); if (empresa.length === 0) return res.status(404).json({ error: 'Empresa não encontrada ou não pertence a você.' }); const [debitos] = await pool.query('SELECT * FROM debitos WHERE empresa_id = ? ORDER BY data_vencimento ASC', [id]); res.json(debitos); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/debitos', authenticateToken, async (req, res) => { try { const { empresa_id, nome, valor, data_vencimento } = req.body; const usuario_id = req.user.id; const [empresa] = await pool.query('SELECT id FROM empresas WHERE id = ? AND usuario_id = ?', [empresa_id, usuario_id]); if (empresa.length === 0) return res.status(404).json({ error: 'Empresa não encontrada ou não pertence a você.' }); const query = 'INSERT INTO debitos (empresa_id, nome, valor, data_vencimento, status) VALUES (?, ?, ?, ?, "Ativo")'; const [result] = await pool.query(query, [empresa_id, nome, valor, data_vencimento]); res.status(201).json({ id: result.insertId, ...req.body }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.put('/api/debitos/:id', authenticateToken, async (req, res) => { try { const { id } = req.params; const usuario_id = req.user.id; const { nome, valor, data_vencimento } = req.body; const [result] = await pool.query('UPDATE debitos d JOIN empresas e ON d.empresa_id = e.id SET d.nome = ?, d.valor = ?, d.data_vencimento = ? WHERE d.id = ? AND e.usuario_id = ?', [nome, valor, data_vencimento, id, usuario_id]); if (result.affectedRows === 0) return res.status(404).json({ error: 'Débito não encontrado ou não pertence a você.' }); res.json({ message: 'Débito atualizado com sucesso.' }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.delete('/api/debitos/:id', authenticateToken, async (req, res) => { try { const { id } = req.params; const usuario_id = req.user.id; const [result] = await pool.query('DELETE d FROM debitos d JOIN empresas e ON d.empresa_id = e.id WHERE d.id = ? AND e.usuario_id = ?', [id, usuario_id]); if (result.affectedRows === 0) return res.status(404).json({ error: 'Débito não encontrado ou não pertence a você.' }); res.status(204).send(); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/debitos/:id/regularizar', authenticateToken, async (req, res) => { try { const { id } = req.params; const usuario_id = req.user.id; const [result] = await pool.query('UPDATE debitos d JOIN empresas e ON d.empresa_id = e.id SET d.status = "Regularizado" WHERE d.id = ? AND e.usuario_id = ?', [id, usuario_id]); if (result.affectedRows === 0) return res.status(404).json({ error: 'Débito não encontrado ou não pertence a você.' }); res.json({ message: 'Débito regularizado com sucesso.' }); } catch (e) { res.status(500).json({ error: e.message }); } });


// --- ROTAS DO DASHBOARD E CONSULTAS COMPLEXAS ---
const getTarefasQuery = (usuarioId, empresaId = null) => `
    SELECT 'Certidão' as tipo, c.id, e.nome as empresa_nome,
        COALESCE(tc.nome, c.nome_personalizado) as nome,
        DATE_ADD(c.data_inicio, INTERVAL COALESCE(tc.validade_dias_padrao, c.validade_dias_personalizada) DAY) as vencimento,
        DATEDIFF(DATE_ADD(c.data_inicio, INTERVAL COALESCE(tc.validade_dias_padrao, c.validade_dias_personalizada) DAY), CURDATE()) as dias_restantes
    FROM certidoes c
    JOIN empresas e ON c.empresa_id = e.id
    LEFT JOIN tipos_certidao tc ON c.tipo_certidao_id = tc.id
    WHERE e.usuario_id = ?
    ${empresaId ? 'AND c.empresa_id = ?' : ''}
`;
app.get('/api/dashboard/fluxo-tarefas', authenticateToken, async (req, res) => {
    try {
        const usuario_id = req.user.id;
        const [certidoes] = await pool.query(getTarefasQuery(usuario_id));
        const [debitos] = await pool.query(`
            SELECT 'Débito' as tipo, d.id, e.nome as empresa_nome, d.nome, d.data_vencimento as vencimento, 
            DATEDIFF(d.data_vencimento, CURDATE()) as dias_restantes 
            FROM debitos d JOIN empresas e ON d.empresa_id = e.id 
            WHERE d.status = 'Ativo' AND e.usuario_id = ?`, [usuario_id]);
        const todasTarefas = [...certidoes, ...debitos];
        todasTarefas.sort((a, b) => a.dias_restantes - b.dias_restantes);
        res.json(todasTarefas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/empresas/:id/urgencias', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const usuario_id = req.user.id;
        const [certidoes] = await pool.query(getTarefasQuery(usuario_id, id), [usuario_id, id]);
        const [debitos] = await pool.query(`SELECT 'Débito' as tipo, id, nome, data_vencimento as vencimento, DATEDIFF(data_vencimento, CURDATE()) as dias_restantes FROM debitos WHERE status = 'Ativo' AND empresa_id = ?`, [id]);
        const todasUrgencias = [...certidoes, ...debitos];
        todasUrgencias.sort((a, b) => a.dias_restantes - b.dias_restantes);
        res.json(todasUrgencias);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/dashboard/saude-empresas', authenticateToken, async (req, res) => { 
    try {
        const usuario_id = req.user.id;
        const query = `
            SELECT
                e.id, e.nome, e.dono_empresa,
                (SELECT COUNT(*) FROM certidoes c LEFT JOIN tipos_certidao tc ON c.tipo_certidao_id = tc.id WHERE c.empresa_id = e.id AND DATEDIFF(DATE_ADD(c.data_inicio, INTERVAL COALESCE(tc.validade_dias_padrao, c.validade_dias_personalizada) DAY), CURDATE()) < 1) +
                (SELECT COUNT(*) FROM debitos d WHERE d.empresa_id = e.id AND d.status = 'Ativo' AND DATEDIFF(d.data_vencimento, CURDATE()) < 1) AS vencidos,
                
                (SELECT COUNT(*) FROM certidoes c LEFT JOIN tipos_certidao tc ON c.tipo_certidao_id = tc.id WHERE c.empresa_id = e.id AND DATEDIFF(DATE_ADD(c.data_inicio, INTERVAL COALESCE(tc.validade_dias_padrao, c.validade_dias_personalizada) DAY), CURDATE()) BETWEEN 1 AND 30) +
                (SELECT COUNT(*) FROM debitos d WHERE d.empresa_id = e.id AND d.status = 'Ativo' AND DATEDIFF(d.data_vencimento, CURDATE()) BETWEEN 1 AND 30) AS a_vencer
            FROM empresas e
            WHERE e.usuario_id = ?
            GROUP BY e.id, e.nome, e.dono_empresa
            ORDER BY vencidos DESC, a_vencer DESC, e.nome;
        `;
        const [rows] = await pool.query(query, [usuario_id]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});