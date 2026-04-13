-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable crypto functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create database if not exists (handled by Docker env vars, just extensions here)
COMMENT ON DATABASE coverai_db IS 'CoverAI Insurance Aggregation Platform';
