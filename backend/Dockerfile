FROM python:3.11-slim

# Install system dependencies for Playwright (Chromium) and PyMuPDF
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    libx11-xcb1 fonts-liberation wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright Chromium browser
RUN playwright install chromium

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p uploads pdf_cache

# Make start script executable
RUN chmod +x start.sh

EXPOSE 8000

# Use start.sh which runs migrations then starts uvicorn
CMD ["./start.sh"]
