from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, JSON
from sqlalchemy.sql import func
from database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    department = Column(String, nullable=False)  # Engineering, HR, Finance, IT, Legal, Marketing
    designation = Column(String, nullable=False)
    skill_tags = Column(JSON, default=[])        # e.g. ["Database", "Python", "Networking"]
    availability = Column(String, default="Available")  # Available, Busy, On Leave
    is_active = Column(Boolean, default=True)
    avg_resolution_hours = Column(Float, default=0.0)  # calculated from past tickets
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    
    # Submitted by user
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    submitted_by = Column(String, nullable=False)  # name or email
    
    # AI analysis output (filled after AI processes it)
    ai_category = Column(String)       # Billing, Bug, Access, HR, Server, DB, Feature, Other
    ai_summary = Column(Text)
    ai_severity = Column(String)       # Critical, High, Medium, Low
    ai_sentiment = Column(String)      # Frustrated, Neutral, Polite
    ai_confidence = Column(Float)
    ai_resolution_path = Column(String)  # "auto" or "assign"
    ai_suggested_dept = Column(String)
    ai_est_hours = Column(Float)
    
    # Routing result
    assigned_dept = Column(String)
    assigned_employee_id = Column(Integer)
    
    # Lifecycle
    status = Column(String, default="New")   # New, Assigned, In Progress, Pending Info, Resolved, Closed
    auto_response = Column(Text)             # filled if auto-resolved
    feedback_helpful = Column(Boolean)       # Yes/No from user on auto-response
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True))


class TicketHistory(Base):
    __tablename__ = "ticket_history"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, nullable=False)
    action = Column(String)      # e.g. "Status changed to In Progress"
    note = Column(Text)          # internal note content
    performed_by = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    id         = Column(Integer, primary_key=True, index=True)
    ticket_id  = Column(Integer, nullable=False)
    recipient  = Column(String)
    subject    = Column(String)
    message    = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())