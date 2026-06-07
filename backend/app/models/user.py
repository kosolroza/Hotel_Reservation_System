import enum
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


# ✅ UserRole MUST come first before User class
class UserRole(str, enum.Enum):
    guest = "guest"
    admin = "admin"
    staff = "staff"


# ✅ User class comes after UserRole
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    passport_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date_of_birth: Mapped[str | None] = mapped_column(String(20), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.guest)
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reservations: Mapped[list["Reservation"]] = relationship(back_populates="guest", lazy="selectin")
    feedbacks: Mapped[list["Feedback"]] = relationship(back_populates="user", lazy="selectin")
    staff_profile: Mapped["Staff | None"] = relationship(back_populates="user", uselist=False, lazy="selectin")