🚀 Valuation AI
An AI-powered agent that analyzes startup pitch decks and websites to generate instant investment memos and valuation estimates.

✨ What It Does
Input: Upload a PDF pitch deck or paste a company website link.

Analyze: GPT-4o extracts revenue, growth rates, and product details.

Visualize: Auto-generates a SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) and a valuation chart.

Chat: Ask the "Analyst" questions about the deck (e.g., "Who are the competitors?").

Report: Export a professional investment memo to PDF.

🛠️ Tech Stack
Frontend: Next.js (React), Tailwind CSS, Shadcn UI

Backend: Python (FastAPI), BeautifulSoup (Web Scraping)

AI: OpenAI GPT-4o (Custom RAG Pipeline)

Database: Supabase (PostgreSQL) + Clerk Auth

🚀 Quick Start
Bash

# 1. Clone & Install Frontend
git clone https://github.com/yourusername/valuation-ai.git
cd valuation-ai
npm install && npm run dev

# 2. Run Backend (in new terminal)
pip install -r requirements.txt
python3 -m uvicorn api.index:app --reload
