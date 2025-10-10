# Dockerfile for Arabic Voice Agent
# Optimized for Render deployment

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY .env* ./

# Set Python path
ENV PYTHONPATH=/app

# Expose port (for health checks if needed)
EXPOSE 8080

# Run the agent
CMD ["python", "src/main.py", "start"]
