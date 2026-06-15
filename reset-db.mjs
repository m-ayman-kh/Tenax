import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const sql = neon('postgresql://neondb_owner:npg_YVXB9MNaHjx3@ep-patient-river-a2l2y4l0.eu-central-1.aws.neon.tech/neondb?sslmode=require');

console.log('Dropping all tables...');
await sql`DROP TABLE IF EXISTS poll_votes, polls, announcements, transactions, transaction_categories, profiles, units, notification_settings, buildings CASCADE`;
console.log('All tables dropped.');

const schema = readFileSync('/Users/ana/Documents/myclaude/Tenax/app/schema.sql', 'utf8');

// Split on semicolons but be careful with multi-line statements
const statements = schema
  .replace(/--[^\n]*/g, '')   // strip line comments
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Running ${statements.length} SQL statements...`);

for (const stmt of statements) {
  try {
    await sql.query(stmt);
    process.stdout.write('.');
  } catch (e) {
    console.error('\n❌ Error:', e.message);
    console.error('Statement:', stmt.slice(0, 120));
  }
}

const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
console.log('\n✅ Tables:', tables.map(t => t.tablename).join(', '));
