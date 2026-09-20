import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL
export const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null

export async function query<T>(text: string, values: unknown[] = []) {
  if (!pool) throw new Error('DATABASE_URL não configurada')
  return pool.query<T>(text, values)
}
