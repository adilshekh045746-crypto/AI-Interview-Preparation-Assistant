# AI Interview Preparation Assistant

A full-stack interview practice app built with React (Vite) and Python (FastAPI).

## Features
- Generate role-specific interview questions by difficulty and topic
- Conduct a mock interview in a chat interface
- Analyze an answer with structured feedback
- Calculate an overall performance score
- Demo mode works without an API key; real AI mode uses OpenAI

## Requirements
- Python 3.10+
- Node.js 18+
- An OpenAI API key for live AI responses (optional for demo mode)

## 1. Start the backend

Open a terminal in the project folder:

```bash
cd backend
python -m venv .venv
```

Activate the environment:

Windows PowerShell:
```powershell
.venv\Scripts\Activate.ps1
```

Windows CMD:
```cmd
.venv\Scripts\activate
```

macOS/Linux:
```bash
source .venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and add your API key if you want live AI:
```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

Run:
```bash
uvicorn main:app --reload
```

Backend runs at http://127.0.0.1:8000
API docs: http://127.0.0.1:8000/docs

## 2. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## How to use
1. Enter a job role, choose difficulty and topic, then generate questions.
2. Start a mock interview and answer the interviewer one question at a time.
3. Use Analyze Answer to receive feedback on an individual response.
4. Finish the interview to view the performance score.

## Notes
- Never put your API key in the React frontend. Keep it in `backend/.env`.
- Demo mode is used automatically when `OPENAI_API_KEY` is empty.
- The score is an educational practice estimate, not a hiring decision or guarantee.
