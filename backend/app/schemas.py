import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class MemoCreate(BaseModel):
    title: str
    body: str = ""
    tag_ids: list[uuid.UUID] = []


class MemoUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    tag_ids: list[uuid.UUID] | None = None


class TagResponse(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MemoResponse(BaseModel):
    id: uuid.UUID
    title: str
    body: str
    created_at: datetime
    updated_at: datetime
    tags: list[TagResponse] = []

    model_config = {"from_attributes": True}


class TagCreate(BaseModel):
    name: str
