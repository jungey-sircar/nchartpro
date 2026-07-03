package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var db *sql.DB

// DBConfig holds PostgreSQL connection parameters.
type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
}

// getDBConfig reads config from environment variables with sensible defaults.
func getDBConfig() DBConfig {
	return DBConfig{
		Host:     envOrDefault("DB_HOST", "localhost"),
		Port:     envOrDefault("DB_PORT", "5432"),
		User:     envOrDefault("DB_USER", "postgres"),
		Password: envOrDefault("DB_PASSWORD", "eric@123"),
		DBName:   envOrDefault("DB_NAME", "nchartpro"),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// InitDB opens the PostgreSQL connection and runs schema migration.
func InitDB() error {
	cfg := getDBConfig()
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName,
	)

	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("sql.Open: %w", err)
	}

	if err = db.Ping(); err != nil {
		return fmt.Errorf("db.Ping: %w", err)
	}

	log.Printf("✓ Connected to PostgreSQL (%s@%s:%s/%s)", cfg.User, cfg.Host, cfg.Port, cfg.DBName)

	// Run schema migration
	if err = runMigration(); err != nil {
		return fmt.Errorf("migration: %w", err)
	}

	return nil
}

// runMigration executes the schema.sql inline to create tables if they don't exist.
func runMigration() error {
	schema := `
		CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

		CREATE TABLE IF NOT EXISTS sessions (
			id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id     UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			token       VARCHAR(64) UNIQUE NOT NULL,
			device_info TEXT,
			created_at  TIMESTAMPTZ DEFAULT NOW(),
			expires_at  TIMESTAMPTZ NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

		-- Add verification columns if they don't exist (idempotent migration)
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verified') THEN
				ALTER TABLE users ADD COLUMN verified BOOLEAN DEFAULT FALSE;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verification_code') THEN
				ALTER TABLE users ADD COLUMN verification_code VARCHAR(6);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verification_expires_at') THEN
				ALTER TABLE users ADD COLUMN verification_expires_at TIMESTAMPTZ;
			END IF;
		END $$;
	`

	_, err := db.Exec(schema)
	if err != nil {
		return err
	}

	log.Println("✓ Database schema is up to date")
	return nil
}
