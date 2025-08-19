// server.js
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Rota principal para o Dashboard - O coração do sistema
app.get('/dashboard', async (req, res) => {
    try {
        const query = `
            SELECT
                c.id as certidao_id,
                c.nome as certidao_nome,
                e.nome as empresa_nome,
                DATE_ADD(c.data_inicio, INTERVAL c.validade_dias DAY) as data_vencimento,
                DATEDIFF(DATE_ADD(c.data_inicio, INTERVAL c.validade_dias DAY), CURDATE()) as dias_para_vencer
            FROM certidoes c
            JOIN empresas e ON c.empresa_id = e.id
            ORDER BY dias_para_vencer ASC;
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        res.status(500).send('Erro no servidor');
    }
});

// ROTA PARA LISTAR TODAS AS EMPRESAS (vamos usar no formulário do frontend)
app.get('/empresas', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM empresas ORDER BY nome ASC');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar empresas:', error);
        res.status(500).send('Erro no servidor');
    }
});

// ROTA PARA CRIAR UMA NOVA EMPRESA
app.post('/empresas', async (req, res) => {
    const { nome, cnpj } = req.body;
    if (!nome || !cnpj) {
        return res.status(400).json({ error: 'Nome e CNPJ são obrigatórios.' });
    }
    try {
        const query = 'INSERT INTO empresas (nome, cnpj) VALUES (?, ?)';
        const [result] = await pool.query(query, [nome, cnpj]);
        res.status(201).json({ id: result.insertId, nome, cnpj });
    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        res.status(500).send('Erro no servidor');
    }
});

// ROTA PARA CRIAR UMA NOVA CERTIDÃO
app.post('/certidoes', async (req, res) => {
    const { empresa_id, nome, data_inicio, validade_dias } = req.body;

    if (!empresa_id || !nome || !data_inicio || !validade_dias) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const certidaoQuery = 'INSERT INTO certidoes (empresa_id, nome, data_inicio, validade_dias) VALUES (?, ?, ?, ?)';
        const [certidaoResult] = await connection.query(certidaoQuery, [empresa_id, nome, data_inicio, validade_dias]);
        const novaCertidaoId = certidaoResult.insertId;

        const tarefaQuery = `
            INSERT INTO tarefas (certidao_id, data_vencimento, status)
            VALUES (?, DATE_ADD(?, INTERVAL ? DAY), 'Pendente')
        `;
        await connection.query(tarefaQuery, [novaCertidaoId, data_inicio, validade_dias]);
        
        await connection.commit();
        res.status(201).json({ message: 'Certidão e tarefa inicial criadas com sucesso!', id: novaCertidaoId });

    } catch (error) {
        await connection.rollback();
        console.error('Erro ao criar certidão:', error);
        res.status(500).send('Erro no servidor');
    } finally {
        connection.release();
    }
});

// Rota para "completar" uma renovação e criar o próximo ciclo
app.post('/certidoes/:id/renovar', async (req, res) => {
    const { id } = req.params;
    const { nova_data_inicio } = req.body;

    if (!nova_data_inicio) {
        return res.status(400).json({ error: 'A nova data de início é obrigatória.' });
    }

    try {
        const updateQuery = 'UPDATE certidoes SET data_inicio = ? WHERE id = ?';
        await pool.query(updateQuery, [nova_data_inicio, id]);

        console.log(`Certidão ${id} renovada com sucesso para ${nova_data_inicio}.`);
        res.status(200).json({ message: 'Certidão renovada e novo ciclo iniciado com sucesso!' });

    } catch (error) {
        console.error('Erro ao renovar certidão:', error);
        res.status(500).send('Erro no servidor');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});