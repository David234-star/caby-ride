FROM python:3.11-slim
WORKDIR /app
# Install system dependencies for GeoAlchemy/PostGIS support
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*
RUN pip install poetry
COPY pyproject.toml poetry.lock* ./
# Install deps globally in container (no venv needed for Docker)
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi --no-root
COPY . .