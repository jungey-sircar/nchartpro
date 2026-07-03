-- NChartPro Auth Schema
-- Run: psql -U postgres -d nchartpro -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   VARCHAR(255) UNIQUE NOT NULL,
    username                VARCHAR(100) UNIQUE NOT NULL,
    contact                 VARCHAR(20) NOT NULL,
    password_hash           TEXT NOT NULL,
    verified                BOOLEAN DEFAULT FALSE,
    verification_code       VARCHAR(6),
    verification_expires_at TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table — UNIQUE on user_id enforces single-device login
CREATE TABLE IF NOT EXISTS sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(64) UNIQUE NOT NULL,
    device_info TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
