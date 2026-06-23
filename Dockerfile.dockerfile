# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /frontend

# Copy frontend dependency declarations
COPY frontend/package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy frontend source files
COPY frontend/ .

# Build frontend with relative VITE_API_URL for single-container hosting
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: Final runner image (Python API + Frontend Static assets)
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies required by Python libraries (e.g. lxml, Pillow, psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libxml2-dev \
    libxslt-dev \
    libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy built frontend assets to static/ to be served by FastAPI
COPY --from=frontend-builder /frontend/dist ./static

EXPOSE 8000
ENV PORT=8000

# Start the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
