from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# This creates (or connects to) a file called ticketing.db in your backend folder
SQLALCHEMY_DATABASE_URL = "sqlite:///./ticketing.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # needed for SQLite only
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# This function is a "dependency" — FastAPI will call it automatically
# to give each request its own DB connection, then close it after
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()