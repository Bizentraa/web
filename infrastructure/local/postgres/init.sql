-- Local-only runtime role. Production credentials must come from a secrets manager.
CREATE ROLE bizentra_app
  WITH LOGIN
  PASSWORD 'bizentra_app_local_only'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT;

GRANT CONNECT ON DATABASE bizentra TO bizentra_app;
GRANT USAGE ON SCHEMA public TO bizentra_app;

-- Migrations run later as bizentra_admin. These defaults grant only runtime data access.
ALTER DEFAULT PRIVILEGES FOR ROLE bizentra_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bizentra_app;

ALTER DEFAULT PRIVILEGES FOR ROLE bizentra_admin IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO bizentra_app;

