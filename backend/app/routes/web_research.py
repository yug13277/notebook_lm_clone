"""Authenticated Ask Web endpoint; intentionally separate from PDF chat."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.middleware.context import TenantContext
from app.middleware.deps import get_ctx
from app.services.web_research import WebSearchUnavailable, WebSource, research

router = APIRouter(prefix="/web-research", tags=["web-research"])


class ResearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=500)


class ResearchResponse(BaseModel):
    answer: str
    sources: list[WebSource]
    generated: bool


@router.post("/ask", response_model=ResearchResponse)
async def ask_web(
    request: ResearchRequest,
    _ctx: Annotated[TenantContext, Depends(get_ctx)],
) -> ResearchResponse:
    try:
        answer, sources, generated = await research(request.query.strip())
    except WebSearchUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return ResearchResponse(answer=answer, sources=sources, generated=generated)
