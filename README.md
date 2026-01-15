# 🚀 Valuation AI - Startup Investment Analyst

**Valuation AI** is a full-stack application that acts as an automated Venture Capital analyst. It parses startup pitch decks (PDFs) or company websites (URLs), uses OpenAI's GPT-4o to extract financial data, and generates a dynamic valuation estimate along with a strategic SWOT analysis.

## ✨ Features

* **📄 PDF & URL Analysis:** Upload a pitch deck PDF or paste a link to a company website/document.
* **🧠 AI Extraction (RAG):** Automatically identifies Company Name, Revenue, Growth Rate, and Product Summary using GPT-4o.
* **📊 Dynamic Valuation Engine:** Calculates pre-money valuation based on extracted revenue metrics and growth multipliers.
* **🛡️ SWOT Generator:** Auto-generates Strengths, Weaknesses, Opportunities, and Threats.
* **💬 Interactive Chat:** "Ask the Analyst" feature allows users to ask specific questions about the document (e.g., "Who are the competitors?").
* **🔐 Authentication:** Secure user accounts via Clerk (Next.js Middleware).
* **💾 Database:** Saves analysis history and reports using Supabase (PostgreSQL).
* **🖨️ PDF Reports:** Exports a professional "Investment Memo" as a printable PDF.

## 🛠️ Tech Stack

### **Frontend**
* **Framework:** Next.js 14 (React)
* **Styling:** Tailwind CSS + Shadcn UI
* **Charts:** Recharts (Data Visualization)
* **State:** React Hooks

### **Backend**
* **Server:** Python (FastAPI)
* **AI Processing:** OpenAI API (GPT-4o) + PyPDF + BeautifulSoup4 (Web Scraping)
* **Database:** Supabase (PostgreSQL)
* **Auth:** Clerk

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* Python (v3.9+)
* Supabase Account & Clerk Account

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/valuation-ai.git](https://github.com/yourusername/valuation-ai.git)
cd valuation-ai
