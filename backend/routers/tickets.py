from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import asyncio
import json

from database import get_db
import models, schemas
from schemas import NoteCreate
from services.ai_service import analyze_ticket
from services.routing_service import find_best_assignee, apply_priority_bump

router = APIRouter(prefix="/tickets", tags=["tickets"])

# SSE connection pool
# Each connected browser gets a queue. We push to all of them on changes.
_sse_connections: List[asyncio.Queue] = []


async def _broadcast(event_type: str, data: dict):
    """Push an event to every connected SSE client."""
    payload = json.dumps({"type": event_type, "data": data})
    dead = []
    for q in _sse_connections:
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        _sse_connections.remove(q)


@router.get("/stream")
async def ticket_stream():
    """
    Server-Sent Events endpoint.
    Browser connects once — server pushes updates in real time.
    No page refresh needed.
    """
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    _sse_connections.append(queue)

    async def generator():
        # Send a heartbeat first so the browser knows connection is alive
        yield "data: {\"type\": \"connected\"}\n\n"
        try:
            while True:
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=25)
                    yield f"data: {payload}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat every 25s to keep connection alive through proxies
                    yield ": heartbeat\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if queue in _sse_connections:
                _sse_connections.remove(queue)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


# Notification helper
def _create_notification(db: Session, ticket: models.Ticket, action: str):
    """
    Simulates sending an email notification to the ticket submitter.
    Stored in DB so the UI can display an inbox.
    """
    db.add(models.Notification(
        ticket_id=ticket.id,
        recipient=ticket.submitted_by,
        subject=f"[Ticket #{ticket.id}] {action}",
        message=(
            f"Hi,\n\n"
            f"Your ticket \"{ticket.title}\" has been updated.\n\n"
            f"Status: {ticket.status}\n"
            f"Update: {action}\n\n"
            f"You can track your ticket at any time in the portal.\n\n"
            f"— AI Ticketing System"
        )
    ))


# Avg resolution time updater
def _update_avg_resolution(db: Session, employee_id: int):
    """
    Recalculates and saves average resolution hours for an employee
    every time one of their tickets is resolved.
    """
    resolved = db.query(models.Ticket).filter(
        models.Ticket.assigned_employee_id == employee_id,
        models.Ticket.resolved_at != None,
        models.Ticket.created_at != None
    ).all()

    if not resolved:
        return

    total_hours = sum(
        (t.resolved_at - t.created_at).total_seconds() / 3600
        for t in resolved
        if t.resolved_at and t.created_at
    )

    emp = db.query(models.Employee).filter(
        models.Employee.id == employee_id
    ).first()

    if emp:
        emp.avg_resolution_hours = round(total_hours / len(resolved), 2)


# Submit ticket
@router.post("/", response_model=schemas.TicketOut)
async def submit_ticket(ticket: schemas.TicketCreate, db: Session = Depends(get_db)):

    # Step 1: AI analysis
    ai_result = analyze_ticket(ticket.title, ticket.description)

    category   = ai_result.get("category", "Other")
    severity   = ai_result.get("severity", "Medium")
    resolution = ai_result.get("resolution_path", "assign")
    department = ai_result.get("suggested_department", "IT")

    severity = apply_priority_bump(category, severity)

    # Step 2: Build ticket
    db_ticket = models.Ticket(
        title=ticket.title,
        description=ticket.description,
        submitted_by=ticket.submitted_by,
        ai_category=category,
        ai_summary=ai_result.get("summary"),
        ai_severity=severity,
        ai_sentiment=ai_result.get("sentiment"),
        ai_resolution_path=resolution,
        ai_suggested_dept=department,
        ai_confidence=ai_result.get("confidence"),
        ai_est_hours=ai_result.get("estimated_resolution_hours"),
    )

    # Step 3: Route
    if resolution == "auto":
        db_ticket.status       = "Resolved"
        db_ticket.auto_response = ai_result.get("auto_response", "")
        db_ticket.resolved_at  = datetime.utcnow()
        db_ticket.assigned_dept = "Auto-Resolved"
        history_action = f"Auto-resolved by AI | Category: {category}"
    else:
        assignee = find_best_assignee(db, department, category)
        if assignee:
            db_ticket.assigned_dept        = assignee.department
            db_ticket.assigned_employee_id = assignee.id
            db_ticket.status               = "Assigned"
            history_action = f"Assigned to {assignee.name} ({assignee.department}) | Score-based routing"
        else:
            db_ticket.assigned_dept = department
            db_ticket.status        = "New"
            history_action = f"No available assignee in {department} | Awaiting manual assignment"

    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)

    # Step 4: History + notification
    db.add(models.TicketHistory(
        ticket_id=db_ticket.id,
        action=history_action,
        note=f"Severity: {severity} | Sentiment: {ai_result.get('sentiment')} | Confidence: {ai_result.get('confidence')}%",
        performed_by="AI System"
    ))
    _create_notification(db, db_ticket, "Ticket received and analyzed by AI")
    db.commit()

    # Step 5: Broadcast to all connected browsers
    await _broadcast("ticket_created", {
        "id":         db_ticket.id,
        "title":      db_ticket.title,
        "status":     db_ticket.status,
        "severity":   db_ticket.ai_severity,
        "department": db_ticket.assigned_dept,
    })

    return db_ticket


# Get all tickets
@router.get("/", response_model=List[schemas.TicketOut])
def get_tickets(
    status:     Optional[str] = None,
    department: Optional[str] = None,
    severity:   Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Ticket)
    if status:
        query = query.filter(models.Ticket.status == status)
    if department:
        query = query.filter(models.Ticket.assigned_dept == department)
    if severity:
        query = query.filter(models.Ticket.ai_severity == severity)
    return query.order_by(models.Ticket.created_at.desc()).all()


# Get single ticket
@router.get("/{ticket_id}", response_model=schemas.TicketOut)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


# Get ticket history
@router.get("/{ticket_id}/history", response_model=List[schemas.HistoryOut])
def get_ticket_history(ticket_id: int, db: Session = Depends(get_db)):
    return db.query(models.TicketHistory).filter(
        models.TicketHistory.ticket_id == ticket_id
    ).order_by(models.TicketHistory.created_at.asc()).all()


# Update status
@router.patch("/{ticket_id}/status")
async def update_ticket_status(
    ticket_id:    int,
    status:       str,
    note:         Optional[str] = None,
    performed_by: str = "Agent",
    db: Session = Depends(get_db)
):
    valid = ["New", "Assigned", "In Progress", "Pending Info", "Resolved", "Closed"]
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {valid}")

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_status      = ticket.status
    ticket.status   = status
    ticket.updated_at = datetime.utcnow()

    if status == "Resolved":
        ticket.resolved_at = datetime.utcnow()
        # Update assignee's avg resolution time
        if ticket.assigned_employee_id:
            _update_avg_resolution(db, ticket.assigned_employee_id)

    db.add(models.TicketHistory(
        ticket_id=ticket_id,
        action=f"Status changed: {old_status} → {status}",
        note=note,
        performed_by=performed_by
    ))
    _create_notification(db, ticket, f"Status updated to {status}")
    db.commit()

    # Broadcast to all SSE clients
    await _broadcast("ticket_updated", {
        "id":     ticket.id,
        "status": ticket.status,
    })

    return {"message": f"Ticket {ticket_id} updated to {status}"}


# Add note
@router.post("/{ticket_id}/notes")
async def add_note(ticket_id: int, body: NoteCreate, db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    db.add(models.TicketHistory(
        ticket_id=ticket_id,
        action="Internal note added",
        note=body.note,
        performed_by=body.performed_by
    ))
    db.commit()

    await _broadcast("ticket_updated", {"id": ticket_id, "action": "note_added"})
    return {"message": "Note added"}


# Reassign
@router.patch("/{ticket_id}/reassign")
async def reassign_ticket(
    ticket_id:    int,
    employee_id:  int,
    performed_by: str = "Admin",
    db: Session = Depends(get_db)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id,
        models.Employee.is_active == True
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    old_id                         = ticket.assigned_employee_id
    ticket.assigned_employee_id    = employee_id
    ticket.assigned_dept           = employee.department
    ticket.status                  = "Assigned"
    ticket.updated_at              = datetime.utcnow()

    db.add(models.TicketHistory(
        ticket_id=ticket_id,
        action=f"Manually reassigned to {employee.name}",
        note=f"Previous assignee ID: {old_id}",
        performed_by=performed_by
    ))
    _create_notification(db, ticket, f"Ticket reassigned to {employee.name}")
    db.commit()

    await _broadcast("ticket_updated", {"id": ticket_id, "status": "Assigned"})
    return {"message": f"Ticket reassigned to {employee.name}"}


# Feedback
@router.patch("/{ticket_id}/feedback")
def submit_feedback(ticket_id: int, helpful: bool, db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.ai_resolution_path != "auto":
        raise HTTPException(status_code=400, detail="Feedback only for auto-resolved tickets")
    ticket.feedback_helpful = helpful
    db.commit()
    return {"message": "Feedback recorded"}


# Get notifications
@router.get("/notifications/all", response_model=List[schemas.NotificationOut])
def get_notifications(db: Session = Depends(get_db)):
    return db.query(models.Notification).order_by(
        models.Notification.created_at.desc()
    ).limit(30).all()


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "Marked as read"}