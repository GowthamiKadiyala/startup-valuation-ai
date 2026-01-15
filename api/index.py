from fastapi import FastAPI, UploadFile, File, Form, Request
from pypdf import PdfReader
from openai import OpenAI
from dotenv import load_dotenv
from pydantic import BaseModel
from bs4 import BeautifulSoup
import requests
import io
import json
import os
import time
from pathlib import Path
from typing import Optional
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

script_dir = Path(__file__).resolve().parent
env_path = script_dir.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("OPENAI_API_KEY")
client = None
if api_key:
    client = OpenAI(api_key=api_key)

app = FastAPI()

RATE_LIMIT_STORE = {}
def check_rate_limit(ip_address: str):
    current_time = time.time()
    request_times = RATE_LIMIT_STORE.get(ip_address, [])
    request_times = [t for t in request_times if current_time - t < 60]
    if len(request_times) >= 20: return False 
    request_times.append(current_time)
    RATE_LIMIT_STORE[ip_address] = request_times
    return True

class ChatRequest(BaseModel):
    question: str
    context: str

def get_text_from_url(url: str):
    print(f"\n--- 🔍 DEBUG: STARTING DOWNLOAD ---")
    print(f"Target URL: {url}")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://www.google.com/'
        }
        
        response = requests.get(url, headers=headers, timeout=15, verify=False)
        print(f"Server Response Code: {response.status_code}")
        print(f"Downloaded Size: {len(response.content)} bytes")
        print(f"Content Type Header: {response.headers.get('Content-Type')}")

        if response.status_code != 200:
            print("❌ Error: Server returned non-200 code")
            return None

        # PARSE PDF
        if 'pdf' in url.lower() or 'pdf' in response.headers.get('Content-Type', '').lower():
            print("📄 Detected PDF format. Attempting to read...")
            try:
                reader = PdfReader(io.BytesIO(response.content))
                print(f"Pages Found: {len(reader.pages)}")
                
                text = ""
                for i, page in enumerate(reader.pages[:10]):
                    extracted = page.extract_text()
                    page_len = len(extracted) if extracted else 0
                    print(f"   - Page {i+1}: {page_len} characters extracted")
                    if extracted: text += extracted + "\n"
                
                print(f"✅ Total Extracted Text Length: {len(text)}")
                return text
            except Exception as pdf_err:
                print(f"❌ PDF Reading Error: {pdf_err}")
                return None
        
        # PARSE HTML
        else:
            print("🌐 Detected Website/HTML. Parsing text...")
            soup = BeautifulSoup(response.content, 'html.parser')
            for script in soup(["script", "style", "nav", "footer"]):
                script.extract()
            text = soup.get_text()
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = '\n'.join(chunk for chunk in chunks if chunk)
            print(f"✅ Website Text Length: {len(text)}")
            return text[:10000]

    except Exception as e:
        print(f"❌ CRITICAL FAILURE: {e}")
        return None

@app.post("/api/parse-deck")
async def parse_deck(
    request: Request, 
    file: Optional[UploadFile] = File(None), 
    url: Optional[str] = Form(None)
):
    print("\n🔔 NEW REQUEST RECEIVED")
    client_ip = request.client.host or "unknown"
    if not check_rate_limit(client_ip):
        return {"status": "error", "message": "Rate limit exceeded."}

    text = ""

    if file:
        print(f"📂 Processing File Upload: {file.filename}")
        try:
            content = await file.read()
            reader = PdfReader(io.BytesIO(content))
            for page in reader.pages[:10]:
                extracted = page.extract_text()
                if extracted: text += extracted + "\n"
        except Exception as e:
            return {"status": "error", "message": f"File Error: {str(e)}"}

    elif url:
        clean_url = url.strip()
        text = get_text_from_url(clean_url)
        if not text:
             return {"status": "error", "message": "Download successful, but no text found. (See Terminal Logs)"}

    else:
        return {"status": "error", "message": "No input provided."}
            
    if len(text.strip()) < 50:
        print("⚠️ WARNING: Final text is too short (<50 chars).")
        return {"status": "error", "message": "Content is empty or unreadable."}

    try:
        PROMPT = """
        Extract these fields into strict JSON:
        {
          "company_name": "Name",
          "annual_revenue": 0,
          "growth_rate": 0.0,
          "summary": "One sentence summary.",
          "strength": "Brief strength",
          "weakness": "Brief weakness",
          "opportunity": "Brief opportunity",
          "threat": "Brief threat"
        }
        Use 0 for missing numbers. Return ONLY valid JSON.
        """

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": PROMPT},
                {"role": "user", "content": text[:4000]}
            ],
            temperature=0,
            response_format={"type": "json_object"}
        )

        data = json.loads(response.choices[0].message.content)
        if data.get("annual_revenue", 0) > 100_000_000_000: data["annual_revenue"] = 0
        if data.get("growth_rate", 0) > 10: data["growth_rate"] = data["growth_rate"] / 100

        print("✅ AI Analysis Complete!")
        return { "status": "success", "data": data, "raw_text": text }

    except Exception as e:
        print(f"❌ AI ERROR: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/api/chat")
async def chat_with_deck(req: ChatRequest):
    if not client: return {"status": "error", "message": "Missing API Key"}
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful VC assistant. Answer based ONLY on the context provided."},
                {"role": "user", "content": f"CONTEXT:\n{req.context[:8000]}\n\nQUESTION: {req.question}"}
            ]
        )
        return {"answer": response.choices[0].message.content}
    except Exception as e:
        return {"answer": "Sorry, I couldn't process that."}