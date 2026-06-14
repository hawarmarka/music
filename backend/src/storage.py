"""
HawarMusic — depolama katmanı ve link çözümleme

storage: local dosya sistemi veya S3 uyumlu (boto3) — STORAGE_DRIVER ile seçilir.
sources: YouTube/Spotify linklerinden metadata; doğrudan ses URL tespiti.
"""
import os
import re
import uuid
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from . import core

# ---------------------------------------------------------------- Depolama
class LocalStorage:
    def __init__(self, base: str):
        self.base = Path(base)
        self.base.mkdir(parents=True, exist_ok=True)

    def save_bytes(self, key: str, data: bytes) -> str:
        path = self.base / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    def open_stream(self, key: str):
        path = self.base / key
        if not path.exists():
            return None, 0
        return path.open("rb"), path.stat().st_size

    def delete(self, key: str):
        path = self.base / key
        if path.exists():
            path.unlink()

    def size(self, key: str) -> int:
        path = self.base / key
        return path.stat().st_size if path.exists() else 0


class S3Storage:
    """S3 uyumlu (MinIO, R2, AWS). boto3 gerekir."""
    def __init__(self):
        import boto3
        self.bucket = os.environ["S3_BUCKET"]
        self.client = boto3.client(
            "s3",
            endpoint_url=os.environ.get("S3_ENDPOINT") or None,
            aws_access_key_id=os.environ["S3_ACCESS_KEY"],
            aws_secret_access_key=os.environ["S3_SECRET_KEY"],
            region_name=os.environ.get("S3_REGION", "us-east-1"),
        )

    def save_bytes(self, key: str, data: bytes) -> str:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key

    def open_stream(self, key: str):
        try:
            obj = self.client.get_object(Bucket=self.bucket, Key=key)
            return obj["Body"], obj["ContentLength"]
        except Exception:
            return None, 0

    def delete(self, key: str):
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def signed_url(self, key: str, expires: int = 3600) -> str:
        return self.client.generate_presigned_url(
            "get_object", Params={"Bucket": self.bucket, "Key": key}, ExpiresIn=expires
        )

    def size(self, key: str) -> int:
        try:
            return self.client.head_object(Bucket=self.bucket, Key=key)["ContentLength"]
        except Exception:
            return 0


def get_storage():
    if core.STORAGE_DRIVER == "s3":
        return S3Storage()
    return LocalStorage(core.UPLOAD_DIR)


# ---------------------------------------------------------------- Kapak gradyanı
_GRADIENTS = [
    "linear-gradient(135deg,#5b8cff,#a855f7)",
    "linear-gradient(135deg,#0ea5e9,#6366f1)",
    "linear-gradient(135deg,#8b5cf6,#ec4899)",
    "linear-gradient(135deg,#06b6d4,#3b82f6)",
    "linear-gradient(135deg,#7c3aed,#2563eb)",
    "linear-gradient(135deg,#f43f5e,#8b5cf6)",
]


def gradient_for(seed: str) -> str:
    return _GRADIENTS[hash(seed) % len(_GRADIENTS)]


# ---------------------------------------------------------------- Link çözümleme
YT_RE = re.compile(
    r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/shorts/)([A-Za-z0-9_-]{11})"
)
SPOTIFY_RE = re.compile(r"open\.spotify\.com/(?:intl-[a-z]+/)?(track|album|playlist|episode)/([A-Za-z0-9]+)")
AUDIO_URL_RE = re.compile(r"\.(mp3|m4a|wav|flac|ogg|aac)(\?.*)?$", re.IGNORECASE)


def classify_link(url: str) -> dict:
    """
    Linki sınıflandır:
    - youtube/spotify -> sadece metadata (indirme yok)
    - direct_url      -> indirilebilir ses dosyası (onay gerekli)
    - invalid
    """
    url = (url or "").strip()
    if not url:
        return {"kind": "invalid", "reason": "Boş bağlantı"}

    m = YT_RE.search(url)
    if m:
        vid = m.group(1)
        return {
            "kind": "youtube",
            "external_id": vid,
            "embed": f"https://www.youtube.com/embed/{vid}",
            "external_url": url,
            "cover": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
            "downloadable": False,
        }

    m = SPOTIFY_RE.search(url)
    if m:
        kind, sid = m.group(1), m.group(2)
        return {
            "kind": "spotify",
            "external_id": f"{kind}:{sid}",
            "embed": f"https://open.spotify.com/embed/{kind}/{sid}",
            "external_url": url,
            "cover": None,
            "downloadable": False,
        }

    parsed = urlparse(url)
    if parsed.scheme in ("http", "https") and AUDIO_URL_RE.search(parsed.path):
        ext = "." + AUDIO_URL_RE.search(parsed.path).group(1).lower()
        return {
            "kind": "direct_url",
            "external_url": url,
            "ext": ext,
            "downloadable": True,
        }

    return {"kind": "invalid", "reason": "Desteklenmeyen bağlantı. YouTube, Spotify ya da doğrudan ses dosyası (.mp3/.m4a/.flac/.wav) linki yapıştırın."}


async def fetch_youtube_meta(video_id: str) -> dict:
    """oEmbed ile başlık/sanatçı çek (API anahtarı gerektirmez)."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                "https://www.youtube.com/oembed",
                params={"url": f"https://www.youtube.com/watch?v={video_id}", "format": "json"},
            )
            if r.status_code == 200:
                d = r.json()
                return {"title": d.get("title", ""), "artist": d.get("author_name", "")}
    except Exception:
        pass
    return {"title": "", "artist": ""}


async def download_audio(url: str, max_bytes: int) -> bytes:
    """Doğrudan ses URL'sini indir (boyut sınırı ile)."""
    import httpx
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        async with client.stream("GET", url) as resp:
            if resp.status_code != 200:
                raise ValueError(f"İndirme başarısız (HTTP {resp.status_code})")
            ctype = resp.headers.get("content-type", "")
            if ctype and not any(ctype.startswith(p) for p in ("audio/", "application/octet-stream", "binary/")):
                raise ValueError(f"Bağlantı bir ses dosyası değil ({ctype})")
            buf = bytearray()
            async for chunk in resp.aiter_bytes(1024 * 256):
                buf.extend(chunk)
                if len(buf) > max_bytes:
                    raise ValueError("Dosya boyut sınırını aştı")
            return bytes(buf)


def new_key(family_id: str, ext: str) -> str:
    return f"{family_id}/{uuid.uuid4().hex}{ext}"
