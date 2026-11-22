"""User-owned PDF highlights, guarded by document access roles."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.config.db import tenant_session
from app.middleware.context import TenantContext
from app.middleware.deps import get_ctx
from app.models.annotations import AnnotationCreate, AnnotationOut, PdfAnnotation
from app.services.retrieval.permissions import resolve_allowed_documents

router = APIRouter(prefix="/documents", tags=["annotations"])


async def _check_access(ctx: TenantContext, document_id: uuid.UUID) -> None:
    if document_id not in await resolve_allowed_documents(ctx):
        raise HTTPException(status_code=404, detail="Document not found")


@router.get("/{document_id}/annotations", response_model=list[AnnotationOut])
async def list_annotations(
    document_id: uuid.UUID, ctx: Annotated[TenantContext, Depends(get_ctx)]
) -> list[AnnotationOut]:
    await _check_access(ctx, document_id)
    async with tenant_session(ctx.org_id) as db:
        rows = await db.scalars(
            select(PdfAnnotation)
            .where(
                PdfAnnotation.org_id == ctx.org_id,
                PdfAnnotation.document_id == document_id,
                PdfAnnotation.user_id == ctx.user_id,
            )
            .order_by(PdfAnnotation.created_at)
        )
        return [AnnotationOut.model_validate(row) for row in rows]


@router.post("/{document_id}/annotations", response_model=AnnotationOut, status_code=201)
async def create_annotation(
    document_id: uuid.UUID,
    body: AnnotationCreate,
    ctx: Annotated[TenantContext, Depends(get_ctx)],
) -> AnnotationOut:
    await _check_access(ctx, document_id)
    if any(r.x + r.width > 1.001 or r.y + r.height > 1.001 for r in body.rectangles):
        raise HTTPException(status_code=422, detail="Annotation rectangles must fit on the page")
    async with tenant_session(ctx.org_id) as db:
        row = PdfAnnotation(
            org_id=ctx.org_id,
            document_id=document_id,
            user_id=ctx.user_id,
            page=body.page,
            quote=body.quote,
            rectangles=[r.model_dump() for r in body.rectangles],
            note=body.note,
        )
        db.add(row)
        await db.flush()
        await db.refresh(row)
        return AnnotationOut.model_validate(row)


@router.delete("/{document_id}/annotations/{annotation_id}", status_code=204)
async def delete_annotation(
    document_id: uuid.UUID,
    annotation_id: uuid.UUID,
    ctx: Annotated[TenantContext, Depends(get_ctx)],
) -> None:
    await _check_access(ctx, document_id)
    async with tenant_session(ctx.org_id) as db:
        row = await db.scalar(
            select(PdfAnnotation).where(
                PdfAnnotation.id == annotation_id,
                PdfAnnotation.org_id == ctx.org_id,
                PdfAnnotation.document_id == document_id,
                PdfAnnotation.user_id == ctx.user_id,
            )
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Annotation not found")
        await db.delete(row)
