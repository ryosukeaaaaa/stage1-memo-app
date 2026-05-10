import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth.dependencies import get_current_user
from app.memos.service import list_memos, create_memo, get_memo, update_memo, delete_memo

router = APIRouter(prefix="/memos", tags=["memos"])


@router.get("", response_model=list[schemas.MemoResponse])
def index(
    q: str | None = None,
    tag: str | None = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_memos(db, current_user.id, q, tag)


@router.post("", response_model=schemas.MemoResponse, status_code=201)
def create(
    body: schemas.MemoCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_memo(db, current_user.id, body)


@router.get("/{memo_id}", response_model=schemas.MemoResponse)
def show(
    memo_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memo = get_memo(db, memo_id, current_user.id)
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    return memo


@router.patch("/{memo_id}", response_model=schemas.MemoResponse)
def update(
    memo_id: uuid.UUID,
    body: schemas.MemoUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memo = get_memo(db, memo_id, current_user.id)
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    return update_memo(db, memo, body)


@router.delete("/{memo_id}", status_code=204)
def destroy(
    memo_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memo = get_memo(db, memo_id, current_user.id)
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    delete_memo(db, memo)
