import { Pool } from 'pg';

const globalForPg = globalThis;

// Supabase PostgreSQL pool connection via Supabase Connection Pooler (Supavisor)
// Menggunakan pooler endpoint yang memiliki IPv4, menghindari masalah DNS ISP
export const pgPool = globalForPg.__pg_pool || new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,            // Maksimum koneksi di pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPg.__pg_pool = pgPool;
}
