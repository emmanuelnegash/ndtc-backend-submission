import dotenv from 'dotenv';

dotenv.config();

export const env = {
  ADMIN_USERNAME: process.env.ADMIN_USERNAME!,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD!,
  JWT_SECRET: process.env.JWT_SECRET!,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export const PORT = Number(process.env.PORT) || 3001;
export const DATABASE_PATH = process.env.DATABASE_PATH || './data/development.db';
export const JWT_SECRET = process.env.JWT_SECRET!; // your .env must define this
