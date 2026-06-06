from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone : Optional[str] = None
    address: Optional[str] = None
    nationality: Optional[str] = None
    gender: Optional[str] = None
    passport_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    # Accept either phone or phone_number from the frontend
    phone: Optional[str] = None
    phone_number: Optional[str] = None
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    def get_phone(self) -> Optional[str]:
        return self.phone_number or self.phone


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone : Optional[str] = None
    address: Optional[str] = None
    nationality: Optional[str] = None
    gender: Optional[str] = None
    passport_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    phone_number: Optional[str] = None   # frontend sends phone_number
    phone: Optional[str] = None          # legacy alias
    avatar: Optional[str] = None
    profile_picture: Optional[str] = None  # frontend sends profile_picture

    def get_phone(self) -> Optional[str]:
        return self.phone_number or self.phone

    def get_avatar(self) -> Optional[str]:
        return self.profile_picture or self.avatar


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone : Optional[str] = None
    address: Optional[str] = None
    nationality: Optional[str] = None
    gender: Optional[str] = None
    passport_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    role: str
    avatar: Optional[str] = None
    phone_number: Optional[str] = Field(None, validation_alias="phone")
    profile_picture: Optional[str] = Field(None, validation_alias="avatar")
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v
