FROM python:3.13-slim

WORKDIR /app

COPY pyproject.toml ./

# TODO Make it possible to install dependencies from pyproject.toml
RUN pip install --no-cache-dir --progress-bar off \
    fastapi==0.133.1 \
    httpx==0.28.1 \
    loguru==0.7.3 \
    ollama==0.6.1 \
    ruff==0.15.4 \
    uvicorn==0.41.0
    

COPY app/. ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:chat_app", "--host", "0.0.0.0", "--port", "8000"]
