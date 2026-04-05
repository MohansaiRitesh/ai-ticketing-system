from sqlalchemy.orm import Session
import models
from datetime import datetime, timedelta

# Maps ticket categories to skill keywords we look for in employee skill_tags
# This is how we connect AI output to employee skills
CATEGORY_SKILL_MAP = {
    "Server":   ["Server", "DevOps", "Networking", "Infrastructure"],
    "DB":       ["Database", "SQL", "DB", "Python"],
    "Bug":      ["Python", "API", "Backend", "Frontend", "Engineering"],
    "Feature":  ["Python", "API", "Backend", "Frontend", "Engineering"],
    "Access":   ["Access", "Networking", "Hardware", "IT"],
    "Billing":  ["Billing", "Payroll", "Reimbursement", "Finance"],
    "HR":       ["Onboarding", "Policy", "Leave", "HR"],
    "Legal":    ["Compliance", "Contracts", "Legal"],
    "Other":    [],
}

# Maps department names to fallback departments if no one is available
# e.g. DevOps ticket but no DevOps employee → fall back to Engineering
DEPT_FALLBACK = {
    "DevOps":      "Engineering",
    "Engineering":  None,
    "Finance":      None,
    "HR":           None,
    "IT":           None,
    "Legal":        None,
    "Marketing":    None,
}

# Priority bump — certain categories always go Critical
PRIORITY_BUMP = {
    "Server": "Critical",
    "DB":     "Critical",
}


def score_employee(employee, category: str, open_ticket_counts: dict) -> float:
    """
    Returns a float 0.0 to 1.0 representing how suitable this employee is.
    
    Teacher note: we separate scoring from selecting so we can test it independently.
    A function that does ONE thing is much easier to debug.
    """

    # Hard block — never assign to someone on leave
    if employee.availability == "On Leave":
        return 0.0

    # Skill match score (50% weight)
    relevant_skills = CATEGORY_SKILL_MAP.get(category, [])
    
    if not relevant_skills:
        skill_score = 0.5  # no skill requirements → neutral
    else:
        employee_skills = [s.lower() for s in (employee.skill_tags or [])]
        matched = sum(
            1 for skill in relevant_skills
            if skill.lower() in employee_skills
        )
        skill_score = matched / len(relevant_skills)

    # Load score (30% weight)
    # Fewer open tickets = better score
    # We cap at 10 to avoid penalising busy people too harshly
    open_count = open_ticket_counts.get(employee.id, 0)
    load_score = max(0.0, 1.0 - (open_count / 10))

    # Availability score (20% weight)
    availability_score = 1.0 if employee.availability == "Available" else 0.5

    # Weighted final score
    final = (skill_score * 0.5) + (load_score * 0.3) + (availability_score * 0.2)
    return round(final, 3)


def find_best_assignee(db: Session, department: str, category: str):
    """
    Finds the best employee in the given department for this ticket category.
    Returns the employee object or None if no one is available.
    """

    # Get all active employees in the target department
    employees = db.query(models.Employee).filter(
        models.Employee.department == department,
        models.Employee.is_active == True,
        models.Employee.availability != "On Leave"
    ).all()

    # If nobody in that department, try the fallback department
    if not employees:
        fallback = DEPT_FALLBACK.get(department)
        if fallback:
            employees = db.query(models.Employee).filter(
                models.Employee.department == fallback,
                models.Employee.is_active == True,
                models.Employee.availability != "On Leave"
            ).all()

    if not employees:
        return None

    # Count open tickets per employee (for load scoring)
    # We do this in one query instead of N queries — more efficient
    open_ticket_counts = {}
    for emp in employees:
        count = db.query(models.Ticket).filter(
            models.Ticket.assigned_employee_id == emp.id,
            models.Ticket.status.in_(["Assigned", "In Progress", "Pending Info"])
        ).count()
        open_ticket_counts[emp.id] = count

    # Score every candidate and pick the highest
    scored = [
        (employee, score_employee(employee, category, open_ticket_counts))
        for employee in employees
    ]

    # Sort by score descending, pick the best
    scored.sort(key=lambda x: x[1], reverse=True)
    best_employee, best_score = scored[0]

    # If best score is 0, nobody suitable was found
    return best_employee if best_score > 0 else None


def apply_priority_bump(category: str, current_severity: str) -> str:
    """
    Certain ticket categories always get bumped to Critical per the spec.
    Server down and DB corruption should never sit at Medium.
    """
    bumped = PRIORITY_BUMP.get(category)
    if bumped:
        return bumped
    return current_severity

def escalate_overdue_tickets(db: Session):
    """
    Runs periodically. If a Critical/High ticket hasn't moved in 2 hours,
    re-assign it to someone else.
    """
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)

    overdue = db.query(models.Ticket).filter(
        models.Ticket.status == "Assigned",
        models.Ticket.ai_severity.in_(["Critical", "High"]),
        models.Ticket.created_at <= two_hours_ago
    ).all()

    for ticket in overdue:
        # Find a different assignee
        new_assignee = find_best_assignee(
            db, ticket.assigned_dept, ticket.ai_category
        )

        if new_assignee and new_assignee.id != ticket.assigned_employee_id:
            old_id = ticket.assigned_employee_id
            ticket.assigned_employee_id = new_assignee.id
            ticket.updated_at = datetime.utcnow()

            db.add(models.TicketHistory(
                ticket_id=ticket.id,
                action=f"Escalated: re-assigned from employee #{old_id} to {new_assignee.name}",
                note="Auto-escalated: High/Critical ticket not picked up within 2 hours",
                performed_by="Escalation Engine"
            ))

    db.commit()
    return len(overdue)