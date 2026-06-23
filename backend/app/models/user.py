import enum
from sqlalchemy import Column, Integer, String, Enum as SAEnum
from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    contributor = "contributor"
    viewer = "viewer"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.viewer)
    full_name = Column(String(200), nullable=True)
    is_active = Column(String(10), default="true")
