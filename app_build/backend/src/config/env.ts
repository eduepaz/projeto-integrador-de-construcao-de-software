import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://pulsepass:pulsepass_secret@localhost:5432/pulsepass_master',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  KAFKA_BROKERS: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || 'pulsepass-backend',
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || 'pulsepass-workers',
  JWT_SECRET: process.env.JWT_SECRET || 'pulsepass_super_secret_jwt_key_2026_production_grade',
  HMAC_TICKET_SECRET: process.env.HMAC_TICKET_SECRET || 'pulsepass_hmac_secret_sha256_access_token_secure_key',
  LOCK_TTL_SECONDS: 600, // 10 minutes strict timeout
};
