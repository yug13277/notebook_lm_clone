"""Web research must expose real sources and never synthesize in fake mode."""

from __future__ import annotations

import pytest

from app.config.settings import settings
from app.services import web_research


@pytest.mark.asyncio
async def test_fake_mode_returns_linked_previews(monkeypatch) -> None:
    async def fake_search(_query: str) -> list[web_research.WebSource]:
        return [web_research.WebSource("Example", "https://example.com/a", "Verified excerpt")]

    monkeypatch.setattr(web_research, "search_web", fake_search)
    monkeypatch.setattr(settings, "LLM_MODE", "fake")
    answer, sources, generated = await web_research.research("What happened?")
    assert not generated
    assert "[1] Verified excerpt" in answer
    assert sources[0].url == "https://example.com/a"


@pytest.mark.asyncio
async def test_search_rejects_non_https_results(monkeypatch) -> None:
    import httpx

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            pass

        async def get(self, *_args, **_kwargs):
            return httpx.Response(
                200,
                json={
                    "results": [
                        {
                            "title": "Chemical bonds explained",
                            "url": "https://example.com",
                            "content": "Chemistry lesson",
                        },
                        {
                            "title": "YouTube home",
                            "url": "https://youtube.com",
                            "content": "Watch videos",
                        },
                        {"title": "Bad", "url": "javascript:alert(1)", "content": "Chemical bonds"},
                    ]
                },
                request=httpx.Request("GET", "http://127.0.0.1:8888/search"),
            )

    monkeypatch.setattr(settings, "BRAVE_SEARCH_API_KEY", None)
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_kwargs: FakeClient())
    sources = await web_research.search_web("chemical bonds in chemistry")
    assert len(sources) == 1
    assert sources[0].url == "https://example.com"


def test_unrelated_youtube_result_is_rejected() -> None:
    unrelated = web_research.WebSource(
        "YouTube", "https://youtube.com", "Enjoy videos, music, and creators"
    )
    assert not web_research._is_relevant("explain chemical bonds in chemistry", unrelated)
