import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# THE SYSTEM PROMPT

ANALYSIS_SYSTEM_PROMPT = """
You are an intelligent ticket analysis engine for an internal helpdesk system.
Your job is to analyze support tickets and return a structured JSON response.

You must ALWAYS return valid JSON and NOTHING else.
No explanation, no markdown, no code blocks — raw JSON only.

The JSON must have exactly these fields:

{
  "category": one of ["Billing", "Bug", "Access", "HR", "Server", "DB", "Feature", "Other"],
  "summary": "2-3 sentence summary of the issue",
  "severity": one of ["Critical", "High", "Medium", "Low"],
  "sentiment": one of ["Frustrated", "Neutral", "Polite"],
  "resolution_path": one of ["auto", "assign"],
  "suggested_department": one of ["Engineering", "Finance", "HR", "IT", "Legal", "Marketing", "DevOps"],
  "confidence": integer between 0 and 100,
  "estimated_resolution_hours": a number like 1, 4, 8, 24, 48,
  "auto_response": "if resolution_path is auto, write a full helpful response here. If assign, leave this empty string."
}

Severity rules:
- Critical: system down, data loss, security breach, nothing works
- High: major feature broken, affects many users, access completely blocked
- Medium: partial issue, workaround exists
- Low: question, minor inconvenience, feature request

Resolution path rules:
- auto: password resets, HR policy questions, leave application process,
        general FAQs, status update requests, simple billing clarifications
- assign: anything requiring actual investigation, fixes, account changes,
          legal review, payroll corrections, server/DB work

Sentiment rules:
- Frustrated: caps lock, exclamation marks, words like "urgent", "again", "seriously", "ridiculous"
- Polite: please, thank you, appreciative language
- Neutral: everything else

Department routing rules:
- DB issues, bugs, server down → Engineering
- Server/infra/deployment → DevOps (or Engineering if no DevOps)
- Payroll, billing, reimbursement → Finance
- Leave, HR policy, onboarding → HR
- Access, permissions, account lock → IT
- Product bugs, feature requests → Engineering
- Marketing, content, branding → Marketing
- Legal, compliance, contracts → Legal
"""


def analyze_ticket(title: str, description: str) -> dict:
    """
    Sends the ticket to Groq and returns parsed JSON.
    This is the core function — called every time a ticket is submitted.
    """
    
    user_message = f"""
Title: {title}
Description: {description}

Analyze this ticket and return the JSON response.
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            temperature=0.1,  # low temperature = more consistent, predictable output
            max_tokens=800,
        )

        raw = response.choices[0].message.content.strip()

        # Sometimes models wrap JSON in ```json ... ``` even when told not to so we need to strip that safely
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        result = json.loads(raw)
        return result

    except json.JSONDecodeError as e:
        # If AI returns malformed JSON, return a safe fallback
        # so the system doesn't crash — it still creates the ticket
        return {
            "category": "Other",
            "summary": "Could not parse AI response. Manual review needed.",
            "severity": "Medium",
            "sentiment": "Neutral",
            "resolution_path": "assign",
            "suggested_department": "IT",
            "confidence": 0,
            "estimated_resolution_hours": 8,
            "auto_response": ""
        }

    except Exception as e:
        raise Exception(f"AI service error: {str(e)}")


def generate_auto_response(title: str, description: str, category: str) -> str:
    """
    Separate function for generating richer auto-responses when needed.
    For most cases, the auto_response field from analyze_ticket() is enough.
    This is a backup for edge cases.
    """
    prompt = f"""
You are a helpful IT support agent. Write a professional, specific response to this ticket.
Reference the exact issue raised. End with: "Was this helpful? Please reply with Yes or No."
Do not be generic. Maximum 150 words.

Ticket title: {title}
Ticket description: {description}
Category: {category}
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=300,
    )
    return response.choices[0].message.content.strip()