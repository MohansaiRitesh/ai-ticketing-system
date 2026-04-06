# AI Ticketing System

An intelligent internal helpdesk platform where AI reads every incoming support ticket, 
decides whether to auto-resolve it or route it to the right human — with the right skills, 
lowest workload, and available right now.

Built as part of the Advanced AI Ticketing System project.

---

## Project Overview

Traditional helpdesks waste hours on manual triage. This system eliminates that:

- Every ticket is analyzed by AI before any human sees it
- Simple queries are resolved instantly with a specific, helpful response
- Complex issues are routed to the best available employee — scored by skill match, current ticket load, and availability
- The entire ticket lifecycle is tracked with a full audit timeline
- A live analytics dashboard gives managers real-time visibility

---

## Tech Stack

| Layer       | Technology                                  |
|-------------|---------------------------------------------|
| Backend     | Python 3.11, FastAPI, SQLAlchemy, SQLite    |
| AI / LLM    | Groq API — llama-3.3-70b-versatile (free)   |
| Frontend    | React 18, Vite, React Router, Recharts      |
| Real-time   | Server-Sent Events (SSE)                    |
| Styling     | Custom CSS — Netflix dark theme             |

---

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- Free Groq API key from [console.groq.com](https://console.groq.com)

### Backend
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate

pip install fastapi uvicorn sqlalchemy python-dotenv groq pydantic
```

Create `backend/.env`:
GROQ_API_KEY=your_groq_api_key_here

Start the server:
```bash
uvicorn main:app --reload
```

API runs at `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

### Seed employees

Go to `http://localhost:8000/docs` → POST /employees and add these 6 employees:

| Name | Department | Skills |
|------|------------|--------|
| Arjun Sharma | Engineering | Python, Database, API          |
| Priya Mehta  | Engineering | Server, Networking, DevOps     |
| Rahul Verma  | IT          | Access, Networking, Hardware   |
| Sneha Iyer   | HR          |  Onboarding, Policy, Leave     |
| Vikram Nair  | Finance     | Payroll, Billing, Reimbursement|
| Divya Rao    | Legal       | Compliance, Contracts, Legal   |

---

## Feature List

### Module 1 — AI Ticket Analysis
- Classifies every ticket into 8 categories: Billing, Bug, Access, HR, Server, DB, Feature, Other
- Detects severity (Critical / High / Medium / Low) with automatic priority bumps for Server and DB tickets
- Detects user sentiment: Frustrated, Neutral, Polite
- Returns confidence score and estimated resolution time
- AI output treated as a strict JSON contract — routing never reads free text

### Module 2 — Auto-Resolution Engine
- Instantly resolves FAQs, password resets, HR policy questions, billing clarifications
- Response is specific to the exact issue — not generic
- Yes / No feedback stored per ticket
- Feedback drives the AI success rate metric in analytics

### Module 3 — Intelligent Department Routing
- Maps ticket categories to correct departments with priority bumps
- Server/DB → Engineering/DevOps (Critical)
- Access → IT (High)
- Legal → Legal (High)
- Payroll → Finance, HR queries → HR, Bugs → Engineering
- Fallback routing if target department has no available staff

### Module 4 — Employee Directory & Assignee Scoring
- Full employee CRUD: add, edit availability, deactivate
- Assignee scored by: skill match (50%) + ticket load (30%) + availability (20%)
- Average resolution time auto-calculated and updated on every resolve
- On Leave employees never assigned tickets

### Module 5 — Ticket Lifecycle Management
- 6 statuses: New → Assigned → In Progress → Pending Info → Resolved → Closed
- Internal notes on any ticket
- Manual reassignment with full audit log
- Auto-escalation: High/Critical tickets not touched in 2 hours are reassigned
- Complete timeline on every ticket — every action logged
- Simulated email notifications on every status change

### Module 6 — Analytics Dashboard
- Live stat cards: total, open, resolved, auto-resolved, escalated
- Department load breakdown (bar chart)
- Average resolution time by department (horizontal bar chart)
- Top 5 ticket categories this week
- AI auto-resolution success rate

### Bonus — Real-Time Updates
- Server-Sent Events (SSE) push ticket updates to all connected browsers
- No page refresh needed — new tickets and status changes appear instantly
- Live indicator on ticket list + flash banner on updates

---

## Known Limitations

- **SQLite** — file-based DB, not suitable for concurrent production use. Would replace with PostgreSQL + Alembic migrations.
- **No authentication** — all users have full access. Would add JWT-based auth with role separation (admin / agent / submitter).
- **Groq free tier rate limits** — heavy load may slow AI responses. Would add request queuing and retry logic.
- **In-memory SSE pool** — SSE connections are stored in a Python list in memory. Restarting the server drops all connections. Would replace with Redis pub/sub for a production-grade real-time layer.
- **No file attachments** — tickets are text only. Would add S3-backed file upload for screenshots and logs.

---

## Screenshots
<img width="1919" height="898" alt="image" src="https://github.com/user-attachments/assets/ff68e5f5-7ae9-415f-9de9-138f1417df32" />
<img width="1919" height="912" alt="image" src="https://github.com/user-attachments/assets/d3d1d2ca-fc80-4d86-a7e2-69ebca78a0e0" />
<img width="1916" height="913" alt="image" src="https://github.com/user-attachments/assets/f4b72b7d-08e5-498c-b936-2cd2402c8d5a" />
<img width="1919" height="905" alt="image" src="https://github.com/user-attachments/assets/0df800b2-592c-4f47-8ddc-d51226cca9d5" />
<img width="1919" height="915" alt="image" src="https://github.com/user-attachments/assets/22d22192-77fc-43ce-8ad7-14a2e3d7d009" />
<img width="1450" height="895" alt="image" src="https://github.com/user-attachments/assets/3417f553-0fd8-4dbf-8407-b86e4c21b7e4" />

---

## Project Structure
ai-ticketing-system/
├── backend/
│   ├── main.py              # FastAPI app + escalation loop
│   ├── database.py          # SQLite connection
│   ├── models.py            # SQLAlchemy table definitions
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── routers/
│   │   ├── tickets.py       # Ticket CRUD + SSE + notifications
│   │   ├── employees.py     # Employee CRUD
│   │   └── analytics.py     # Dashboard data endpoints
│   └── services/
│       ├── ai_service.py      # Groq integration + prompt engineering
│       └── routing_service.py # Scoring algorithm + escalation
└── frontend/
└── src/
├── api/index.js     # All API calls in one place
├── App.jsx          # Router + sidebar
└── pages/
├── SubmitTicket.jsx
├── TicketList.jsx
├── TicketDetail.jsx
├── Employees.jsx
├── Dashboard.jsx
└── Notifications.jsx
