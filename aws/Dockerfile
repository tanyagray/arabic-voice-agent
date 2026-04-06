FROM python:3.13-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY web-api/pyproject.toml web-api/uv.lock web-api/.python-version ./

RUN uv sync --no-dev --frozen

COPY web-api/ .

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
