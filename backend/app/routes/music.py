import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/music", tags=["music"])


@router.get("/search")
async def search_music(q: str = Query(...), limit: int = Query(20)):
    """Proxy iTunes Search API for music with previews."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://itunes.apple.com/search",
            params={"term": q, "media": "music", "limit": limit},
            timeout=10,
        )
        itunes_data = resp.json()
        # Transform to a common format the frontend expects
        tracks = []
        for item in itunes_data.get("results", []):
            if item.get("previewUrl"):
                tracks.append({
                    "id": item.get("trackId"),
                    "title": item.get("trackName", "Unknown"),
                    "title_short": item.get("trackName", "Unknown"),
                    "preview": item.get("previewUrl"),
                    "artist": {"name": item.get("artistName", "Unknown")},
                    "album": {
                        "title": item.get("collectionName", ""),
                        "cover": item.get("artworkUrl100", ""),
                        "cover_medium": item.get("artworkUrl100", "").replace("100x100", "300x300"),
                        "cover_small": item.get("artworkUrl100", "").replace("100x100", "60x60"),
                    },
                })
        return {"data": tracks, "total": len(tracks)}
