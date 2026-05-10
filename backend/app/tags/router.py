import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app import models, schemas
from app.auth.dependencies import get_current_user
from app.tags.service import list_tags, create_tag, delete_tag

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[schemas.TagResponse])
def index(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_tags(db, current_user.id)


@router.post("", response_model=schemas.TagResponse, status_code=201)
def create(
    body: schemas.TagCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return create_tag(db, current_user.id, body)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Tag name already exists")


@router.delete("/{tag_id}", status_code=204)
def destroy(
    tag_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tag = db.query(models.Tag).filter(
        models.Tag.id == tag_id, models.Tag.user_id == current_user.id
    ).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    delete_tag(db, tag)
