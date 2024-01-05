import { Pool } from 'pg';
import { getDatabaseUri } from './config';

const databaseUri = getDatabaseUri();

const poolConfig = databaseUri.includes('@')
  ? { connectionString: databaseUri }
  : {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: databaseUri.split('///')[1],
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
  };

const pool = new Pool(poolConfig);

export default pool;