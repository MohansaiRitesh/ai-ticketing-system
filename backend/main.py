from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base, SessionLocal
from routers import employees, tickets, analytics
from services.routing_service import escalate_overdue_tickets
import asyncio

async def escalation_loop():
    while True:
        await asyncio.sleep(300)
        db = SessionLocal()
        try:
            count = escalate_overdue_tickets(db)
            if count:
                print(f"[Escalation] Re-assigned {count} overdue ticket(s)")
        finally:
            db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(escalation_loop())
    yield

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Ticketing System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(employees.router)
app.include_router(tickets.router)
app.include_router(analytics.router)

@app.get("/")
def root():
    return {"message": "AI Ticketing System is running"}