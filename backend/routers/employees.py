from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas

router = APIRouter(prefix="/employees", tags=["employees"])


@router.post("/", response_model=schemas.EmployeeOut)
def create_employee(employee: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = db.query(models.Employee).filter(
        models.Employee.email == employee.email
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_employee = models.Employee(**employee.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)  # refresh loads the auto-generated id and created_at
    return db_employee


@router.get("/", response_model=List[schemas.EmployeeOut])
def get_all_employees(
    department: str = None,
    availability: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Employee).filter(models.Employee.is_active == True)
    
    # Optional filters — only applied if passed in the URL
    # e.g. GET /employees?department=Engineering
    if department:
        query = query.filter(models.Employee.department == department)
    if availability:
        query = query.filter(models.Employee.availability == availability)

    return query.all()


@router.get("/{employee_id}", response_model=schemas.EmployeeOut)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.patch("/{employee_id}", response_model=schemas.EmployeeOut)
def update_employee(
    employee_id: int,
    updates: schemas.EmployeeUpdate,
    db: Session = Depends(get_db)
):
    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Only update fields that were actually sent — skip None values
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)

    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/{employee_id}")
def deactivate_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # We never hard-delete — just mark inactive
    # This preserves ticket history and analytics
    employee.is_active = False
    db.commit()
    return {"message": f"{employee.name} has been deactivated"}