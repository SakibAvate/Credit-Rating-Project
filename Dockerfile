FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code + already-trained artifacts (models/, and preprocessor) get copied in.
# Run `python main.py train` locally first, or mount a volume with the
# artifacts if you train outside the container.
COPY . .

EXPOSE 8000
CMD ["uvicorn", "serve.app:app", "--host", "0.0.0.0", "--port", "8000"]
