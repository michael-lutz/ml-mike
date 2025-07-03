# Build frontend
FROM node:18 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Build backend
FROM python:3.11-slim AS backend-build
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .

# Final image
FROM python:3.11-slim
WORKDIR /app
COPY --from=backend-build /app/backend /app/backend
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Install production dependencies
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Install a simple static file server for frontend
RUN pip install fastapi uvicorn

# Expose port
EXPOSE 8080

# Start both backend and serve frontend static files
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]