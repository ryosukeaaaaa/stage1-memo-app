import uuid
from sqlalchemy.orm import Session
from app import models, schemas


def list_memos(db: Session, user_id: uuid.UUID, q: str | None, tag: str | None) -> list[models.Memo]:
    query = db.query(models.Memo).filter(models.Memo.user_id == user_id)
    if q:
        query = query.filter(
            models.Memo.title.ilike(f"%{q}%") | models.Memo.body.ilike(f"%{q}%")
        )
    if tag:
        query = query.join(models.Memo.tags).filter(models.Tag.name == tag)
    return query.order_by(models.Memo.updated_at.desc()).all()


def create_memo(db: Session, user_id: uuid.UUID, body: schemas.MemoCreate) -> models.Memo:
    memo = models.Memo(user_id=user_id, title=body.title, body=body.body)
    if body.tag_ids:
        tags = db.query(models.Tag).filter(
            models.Tag.id.in_(body.tag_ids), models.Tag.user_id == user_id
        ).all()
        memo.tags = tags
    db.add(memo)
    db.commit()
    db.refresh(memo)
    return memo


def get_memo(db: Session, memo_id: uuid.UUID, user_id: uuid.UUID) -> models.Memo | None:
    return db.query(models.Memo).filter(
        models.Memo.id == memo_id, models.Memo.user_id == user_id
    ).first()


def update_memo(db: Session, memo: models.Memo, body: schemas.MemoUpdate) -> models.Memo:
    if body.title is not None:
        memo.title = body.title
    if body.body is not None:
        memo.body = body.body
    if body.tag_ids is not None:
        tags = db.query(models.Tag).filter(
            models.Tag.id.in_(body.tag_ids), models.Tag.user_id == memo.user_id
        ).all()
        memo.tags = tags
    db.commit()
    db.refresh(memo)
    return memo


def delete_memo(db: Session, memo: models.Memo) -> None:
    db.delete(memo)
    db.commit()
