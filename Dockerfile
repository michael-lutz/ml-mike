# --- Build frontend ---
FROM node:18 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# --- Build backend ---
FROM python:3.11-slim AS backend-build
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .

# --- Final image ---
FROM python:3.11-slim
WORKDIR /app

# Copy backend code
COPY --from=backend-build /app/backend /app/backend

# Copy frontend build into backend's static directory
COPY --from=frontend-build /app/frontend/dist /app/backend/app/static

# Copy content directory
COPY backend/content /app/backend/content

# Install dependencies
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Expose port
EXPOSE 8080

# --- Serve frontend with FastAPI ---
# Add this to your backend/app/main.py:
# from fastapi.staticfiles import StaticFiles
# app.mount("/", StaticFiles(directory="static", html=True), name="static")

# Start FastAPI
WORKDIR /app/backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]