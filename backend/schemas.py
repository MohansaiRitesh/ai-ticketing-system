from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Employee
class EmployeeCreate(BaseModel):
    name: str
    email: str
    department: str
    designation: str
    skill_tags: List[str] = []
    availability: str = "Available"

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    skill_tags: Optional[List[str]] = None
    availability: Optional[str] = None
    is_active: Optional[bool] = None

class EmployeeOut(BaseModel):
    id: int
    name: str
    email: str
    department: str
    designation: str
    skill_tags: List[str]
    availability: str
    is_active: bool
    avg_resolution_hours: float
    created_at: datetime

    class Config:
        from_attributes = True


# Ticket
class TicketCreate(BaseModel):
    title: str
    description: str
    submitted_by: str

class TicketOut(BaseModel):
    id: int
    title: str
    description: str
    submitted_by: str
    status: str
    ai_category: Optional[str] = None
    ai_severity: Optional[str] = None
    ai_sentiment: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_resolution_path: Optional[str] = None
    ai_summary: Optional[str] = None
    assigned_dept: Optional[str] = None
    assigned_employee_id: Optional[int] = None
    auto_response: Optional[str] = None
    feedback_helpful: Optional[bool] = None
    ai_est_hours: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Ticket History
class HistoryOut(BaseModel):
    id: int
    ticket_id: int
    action: str
    note: Optional[str] = None
    performed_by: str
    created_at: datetime

    class Config:
        from_attributes = True


# Notes
class NoteCreate(BaseModel):
    note: str
    performed_by: str = "Agent"


# Notifications
class NotificationOut(BaseModel):
    id: int
    ticket_id: int
    recipient: str
    subject: str
    message: str
    is_read: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True