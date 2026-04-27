# Medical Chronology AI Platform

A full-stack, production-ready system for extracting medical chronologies from raw clinical PDFs and images.

## Architecture

- **Frontend:** Next.js (App Router), Tailwind CSS, React
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL
- **AI Engine:** Ollama (Local) or Groq API (Cloud)
- **PDF Engine:** WeasyPrint (via Jinja2 templates)

## Prerequisites
- Docker & Docker Compose (for PostgreSQL)
- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com/) (Optional: if running local LLMs like `llama3` or `phi3`)

## Step 1: Start the Database
The application requires PostgreSQL. Spin it up using Docker:
```bash
docker-compose up -d
```

## Step 2: Setup the Backend API
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt
```

### Environment Variables
Create `backend/.env`:
```ini
# Database (Matches docker-compose)
POSTGRES_USER=chrono_user
POSTGRES_PASSWORD=chrono_password
POSTGRES_DB=medical_chronology

# AI Configuration (Use Ollama for local 8GB RAM laptops)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi3

# OR use Groq (Uncomment and add key)
# GROQ_API_KEY=your_key_here
```

Start the backend:
```bash
uvicorn app.main:app --reload --port 8000
```
*API Docs available at: http://localhost:8000/docs*

## Step 3: Setup the Frontend
```bash
cd frontend
npm install
```

Start the frontend:
```bash
npm run dev
```
*UI available at: http://localhost:3000*

## Notes on PDF Generation
The backend uses `WeasyPrint` for converting HTML timelines to PDF. 
If you are on Windows, WeasyPrint requires the GTK3 runtime. If GTK3 is not installed, the backend will gracefully fallback to generating an HTML report instead of a PDF report.
