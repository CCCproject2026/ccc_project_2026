FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
# Install dependencies and clean up cache in the same layer
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
