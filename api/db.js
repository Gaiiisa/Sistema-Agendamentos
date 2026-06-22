// Conexão com o MySQL (pool de conexões)
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'agendamentos',
  dateStrings: true,        // DATE/DATETIME/TIME vêm como string ('YYYY-MM-DD', 'HH:MM:SS')
  connectionLimit: 10,
  charset: 'utf8mb4',
});

// helper: roda uma query e devolve só as linhas
export async function q(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
