// db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Crie a conexão com o banco
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3060,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'sua_senha_aqui', // <-- MUDE AQUI
    database: process.env.DB_NAME || 'gestao_certidoes',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;