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

// Rota para "completar" uma renovação e criar o próximo ciclo
app.post('/certidoes/:id/renovar', async (req, res) => {
    const { id } = req.params;
    const { nova_data_inicio } = req.body; // Espera uma data no formato 'YYYY-MM-DD'

    if (!nova_data_inicio) {
        return res.status(400).json({ error: 'A nova data de início é obrigatória.' });
    }

    try {
        // Apenas atualizamos a data de início. A data de vencimento é sempre calculada.
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