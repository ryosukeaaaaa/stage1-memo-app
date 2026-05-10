import uuid
from sqlalchemy.orm import Session
from app import models, schemas


def list_tags(db: Session, user_id: uuid.UUID) -> list[models.Tag]:
    return db.query(models.Tag).filter(models.Tag.user_id == user_id).order_by(models.Tag.name).all()


def create_tag(db: Session, user_id: uuid.UUID, body: schemas.TagCreate) -> models.Tag:
    tag = models.Tag(user_id=user_id, name=body.name)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def delete_tag(db: Session, tag: models.Tag) -> None:
    db.delete(tag)
    db.commit()
