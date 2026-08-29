FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code + frontend + already-trained artifacts get copied in.
# Run `python main.py train` locally first (or mount models/ as a volume)
# so the API has something to load at startup.
COPY . .

EXPOSE 8000
CMD ["uvicorn", "serve.app:app", "--host", "0.0.0.0", "--port", "8000"]
