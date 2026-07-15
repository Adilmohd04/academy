import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const targetId = '6a31e025-c770-4dab-9664-43a4a54b5f84';
  const result = await client.query(
    'SELECT id, title, approval_status FROM courses WHERE id = $1',
    [targetId]
  );

  console.log(JSON.stringify(result.rows, null, 2));
  await client.end();
}

main().catch((error) => {
  console.error('Failed to check course id:', error.message);
  process.exit(1);
});
