from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from database import get_db
from datetime import datetime, timedelta
import models

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    """High-level ticket counts for the dashboard header cards."""
    total       = db.query(models.Ticket).count()
    open_count  = db.query(models.Ticket).filter(
                      models.Ticket.status.in_(["New","Assigned","In Progress","Pending Info"])
                  ).count()
    resolved    = db.query(models.Ticket).filter(
                      models.Ticket.status.in_(["Resolved","Closed"])
                  ).count()
    auto_resolved = db.query(models.Ticket).filter(
                        models.Ticket.ai_resolution_path == "auto"
                    ).count()
    escalated   = db.query(models.TicketHistory).filter(
                      models.TicketHistory.action.like("Escalated%")
                  ).count()

    # Auto-resolution success rate
    feedback_total = db.query(models.Ticket).filter(
        models.Ticket.feedback_helpful != None
    ).count()
    feedback_positive = db.query(models.Ticket).filter(
        models.Ticket.feedback_helpful == True
    ).count()
    success_rate = round(
        (feedback_positive / feedback_total * 100) if feedback_total > 0 else 0, 1
    )

    return {
        "total": total,
        "open": open_count,
        "resolved": resolved,
        "auto_resolved": auto_resolved,
        "escalated": escalated,
        "auto_resolution_success_rate": success_rate,
    }


@router.get("/department-load")
def get_department_load(db: Session = Depends(get_db)):
    """Open ticket count per department — for the bar chart."""
    rows = db.query(
        models.Ticket.assigned_dept,
        func.count(models.Ticket.id).label("count")
    ).filter(
        models.Ticket.status.in_(["New", "Assigned", "In Progress", "Pending Info"]),
        models.Ticket.assigned_dept != "Auto-Resolved"
    ).group_by(models.Ticket.assigned_dept).all()

    return [{"department": r.assigned_dept, "open_tickets": r.count} for r in rows]


@router.get("/avg-resolution-time")
def get_avg_resolution_time(db: Session = Depends(get_db)):
    """Average hours to resolve, per department."""
    resolved = db.query(models.Ticket).filter(
        models.Ticket.resolved_at != None,
        models.Ticket.created_at != None,
        models.Ticket.assigned_dept != "Auto-Resolved"
    ).all()

    dept_data = {}
    for t in resolved:
        dept = t.assigned_dept or "Unknown"
        hours = (t.resolved_at - t.created_at).total_seconds() / 3600
        if dept not in dept_data:
            dept_data[dept] = []
        dept_data[dept].append(hours)

    return [
        {
            "department": dept,
            "avg_hours": round(sum(times) / len(times), 1)
        }
        for dept, times in dept_data.items()
    ]


@router.get("/top-categories")
def get_top_categories(db: Session = Depends(get_db)):
    """Top 5 ticket categories this week."""
    one_week_ago = datetime.utcnow() - timedelta(days=7)

    rows = db.query(
        models.Ticket.ai_category,
        func.count(models.Ticket.id).label("count")
    ).filter(
        models.Ticket.created_at >= one_week_ago,
        models.Ticket.ai_category != None
    ).group_by(
        models.Ticket.ai_category
    ).order_by(
        func.count(models.Ticket.id).desc()
    ).limit(5).all()

    return [{"category": r.ai_category, "count": r.count} for r in rows]


@router.get("/severity-breakdown")
def get_severity_breakdown(db: Session = Depends(get_db)):
    rows = db.query(
        models.Ticket.ai_severity,
        func.count(models.Ticket.id).label("count")
    ).filter(
        models.Ticket.ai_severity != None
    ).group_by(models.Ticket.ai_severity).all()

    return [{"severity": r.ai_severity, "count": r.count} for r in rows]


@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db)):
    return db.query(models.Notification).order_by(
        models.Notification.created_at.desc()
    ).limit(20).all()