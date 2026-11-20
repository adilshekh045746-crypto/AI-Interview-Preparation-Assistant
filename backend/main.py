import json
import os
import random
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv(
    dotenv_path=os.path.join(os.path.dirname(__file__), ".env"),
    override=True
)
app = FastAPI(title="AI Interview Preparation Assistant", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "https://ai-interview-preparation-assistant-1-vjp0.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


class GenerateRequest(BaseModel):
    role: str = Field(min_length=2, max_length=100)
    difficulty: str = "Intermediate"
    topic: str = "Mixed"


class AnalyzeRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    answer: str = Field(min_length=1, max_length=6000)
    role: str = "General"


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    role: str
    difficulty: str = "Intermediate"
    messages: List[ChatMessage]



def ask_ai(system_prompt: str, user_prompt: str) -> Optional[str]:
    import urllib.request

    if not os.getenv("OLLAMA_URL"):
        return None

    try:
        payload = {
            "model": "llama3.2:3b",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "stream": False
        }

        request = urllib.request.Request(
            os.getenv("OLLAMA_URL") + "/api/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        with urllib.request.urlopen(request, timeout=120) as response:
            result = json.loads(response.read())
            return result["message"]["content"]

    except Exception as exc:
        print(f"AI service error: {exc}")
        return None



QUESTION_BANK = {
    "Technical": [
        "Explain a technical concept from {role} that you understand particularly well.",
        "Describe a challenging technical problem you solved and how you approached it.",
        "How do you debug an issue when the cause is not immediately clear?",
        "What tools or technologies are most useful in {role}, and why?",
        "How would you explain a complex technical idea to a beginner?",
    ],
    "HR": [
        "Tell me about yourself and what interests you about this role.",
        "What are your greatest strengths, and how do they help you at work or study?",
        "Describe a time you received feedback. What did you do with it?",
        "How do you manage competing deadlines?",
        "Why should we select you for this opportunity?",
    ],
    "Behavioral": [
        "Tell me about a time you worked with someone whose approach differed from yours.",
        "Describe a mistake you made and what you learned from it.",
        "Give an example of when you took initiative.",
        "Tell me about a difficult goal you achieved.",
        "Describe how you handle disagreement in a team.",
    ],
    "Mixed": [
        "Tell me about yourself and why you chose {role}.",
        "What is one important skill for a person working in {role}?",
        "Describe a problem you solved using a structured approach.",
        "How do you keep learning about new tools and technologies?",
        "What would you like to achieve in your first 90 days?",
    ],
}


@app.get("/")
def home():
    return {"message": "AI Interview Preparation Assistant API is running", "ai_enabled": bool(API_KEY)}


@app.get("/api/status")
def status():
    return {"status": "online", "ai_enabled": bool(API_KEY), "model": MODEL if API_KEY else "demo-mode"}


@app.post("/api/generate")
def generate_questions(data: GenerateRequest):
    prompt = (
        f"Create exactly 6 interview questions for the job role: {data.role}. "
        f"Difficulty: {data.difficulty}. Topic: {data.topic}. "
        "Return only a JSON array of strings. Do not include markdown."
    )
    ai_text = ask_ai("You are an experienced, supportive interview coach.", prompt)
    if ai_text:
        try:
            cleaned = ai_text.strip().removeprefix("```json").removesuffix("```").strip()
            questions = json.loads(cleaned)
            if isinstance(questions, list) and questions:
                return {"questions": [str(q) for q in questions[:6]], "mode": "ai"}
        except (json.JSONDecodeError, TypeError):
            pass
    bank = QUESTION_BANK.get(data.topic, QUESTION_BANK["Mixed"])
    questions = [q.format(role=data.role) for q in bank]
    random.shuffle(questions)
    return {"questions": questions[:5], "mode": "demo"}


@app.post("/api/analyze")
def analyze_answer(data: AnalyzeRequest):
    prompt = f"""
Evaluate this interview response for a {data.role} interview.
Question: {data.question}
Candidate answer: {data.answer}

Return valid JSON with:
clarity (0-10), relevance (0-10), confidence (0-10), structure (0-10),
strengths (array of 2 short strings), improvements (array of 2 short strings),
sample_tip (one practical sentence), summary (2 sentences maximum).
Be constructive and fair. Do not judge the candidate's personality or identity.
"""
    ai_text = ask_ai("You are a fair interview communication coach. Give specific, actionable feedback.", prompt)
    if ai_text:
        try:
            cleaned = ai_text.strip().removeprefix("```json").removesuffix("```").strip()
            result = json.loads(cleaned)
            score_parts = [float(result.get(k, 0)) for k in ("clarity", "relevance", "confidence", "structure")]
            result["score"] = round(sum(score_parts) / 4 * 10)
            result["mode"] = "ai"
            return result
        except (json.JSONDecodeError, TypeError, ValueError):
            pass

    words = data.answer.split()
    length_score = min(10, max(2, len(words) / 12))
    has_example = any(x in data.answer.lower() for x in ("for example", "when i", "for instance", "because"))
    clarity = min(10, round(4 + length_score * 0.55))
    relevance = min(10, round(5 + length_score * 0.35 + (1.5 if has_example else 0)))
    structure = 8 if has_example else 5
    confidence = 7 if len(words) >= 25 else 5
    score = round((clarity + relevance + structure + confidence) / 4 * 10)
    return {
        "clarity": clarity, "relevance": relevance, "confidence": confidence,
        "structure": structure, "score": score, "mode": "demo",
        "strengths": ["You attempted the question in your own words.", "Your response gives the interviewer something to build on."],
        "improvements": [
            "Add one specific example to make your point more convincing.",
            "Use a simple structure: situation, action, and result."
        ],
        "sample_tip": "Try the STAR method: Situation, Task, Action, Result.",
        "summary": "This is an approximate demo-mode review based on answer length and structure. Add an API key for more contextual AI feedback."
    }




@app.post("/api/chat")
def mock_interview(data: ChatRequest):
    from fastapi import HTTPException

    conversation = "\n".join(
        f"{m.role}: {m.content}" for m in data.messages[-12:]
    )

    prompt = f"""
You are a professional AI interview coach.

Job role: {data.role}
Difficulty: {data.difficulty}

Conversation:
{conversation}

Instructions:
- If the interview is starting, ask one relevant question.
- Otherwise, evaluate the candidate's latest answer.
- Give feedback before asking another question.

Use this format:

Result: Correct, Incorrect, Partially Correct,
or Needs Improvement.
Score: Give a score out of 10.
Feedback: Explain the answer quality.
Mistakes: Explain any errors or missing points.
Correct Answer: Provide an improved sample answer.
Next Question: Ask one relevant interview question.

For HR questions, evaluate relevance and clarity
instead of factual correctness.
Do not invent personal experience for the candidate.
Use simple English and constructive feedback.
"""

    try:
        ai_text = ask_ai(
            "You are a fair and helpful AI interview coach.",
            prompt
        )

        
        if not ai_text:
            questions = [
                f"What is an important skill required for a {data.role}?",
                f"What technologies are commonly used in {data.role}?",
                f"Describe a challenging problem related to {data.role}.",
                "How do you handle difficult tasks?",
                "How do you improve your technical skills?",
                "Why should we hire you for this role?"
            ]

            previous = [
                m.content for m in data.messages
                if m.role == "assistant"
            ]

            remaining = [
                q for q in questions
                if q not in previous
            ]

            question = random.choice(remaining or questions)

            return {
                "reply": question,
                "mode": "demo"
            }


        return {
            "reply": ai_text,
            "mode": "ai"
        }

    except Exception as exc:
        print(f"AI service error: {exc}")
        raise HTTPException(
            status_code=503,
            detail="AI service unavailable."
        ) from exc


