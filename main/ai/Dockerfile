FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
# Install CPU-only PyTorch so Docker builds do not pull CUDA/NCCL wheels.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
