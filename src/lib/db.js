import { neon } from '@neondatabase/serverless'

// Neon HTTP client — works in both browser and serverless environments
export const sql = neon(import.meta.env.VITE_DATABASE_URL)
