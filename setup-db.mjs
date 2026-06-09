import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const sql = neon('postgresql://neondb_owner:npg_YVXB9MNaHjx3@ep-patient-river-a2l2y4l0.eu-central-1.aws.neon.tech/neondb?sslmode=require');

const schema = readFileSync('/Users/ana/Documents/myclaude/Tenax/app/schema.sql', 'utf8');

const cleaned = schema
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

const statements = cleaned
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Running ${statements.length} SQL statements...`);

for (const stmt of statements) {
  try {
    await sql.query(stmt);
    process.stdout.write('.');
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('duplicate')) {
      process.stdout.write('s');
    } else {
      console.error('\n❌ Error:', e.message);
      console.error('Statement:', stmt.slice(0, 80));
    }
  }
}

const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
console.log('\n✅ Tables in database:', tables.map(t => t.tablename).join(', '));
