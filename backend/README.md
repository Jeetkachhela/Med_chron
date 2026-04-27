# Medical Chronology Backend

## Setup

1. Start the PostgreSQL database:
   ```bash
   docker-compose up -d
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

## Environment Variables
Create a `.env` file in `backend/`:
```
GROQ_API_KEY=your_key_if_using_groq
OLLAMA_MODEL=phi3
```
