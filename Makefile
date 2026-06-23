.PHONY: dev stop migrate seed test lint

# Start all services
dev:
	docker-compose up --build -d

# Stop all services
stop:
	docker-compose down

# Run Alembic migrations inside the api container
migrate:
	docker-compose exec api alembic upgrade head

# Seed the DB with a default admin user
seed:
	docker-compose exec api python -m app.seed

# Run backend tests
test:
	docker-compose exec api pytest tests/ -v --cov=app

# Lint backend
lint:
	docker-compose exec api ruff check app/

# Run frontend locally without Docker
frontend-dev:
	cd frontend && npm run dev

# Install all dependencies (local dev without Docker)
install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

# Apply migrations locally (non-Docker)
migrate-local:
	cd backend && alembic upgrade head
