"""
HawarMusic — çekirdek: config, veritabanı, kimlik doğrulama, güvenlik
"""
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import asyncpg
from fastapi import Depends, HTTPException, Header
from passlib.context import CryptContext
from jose import jwt, JWTError

# ---------------------------------------------------------------- Config
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://hawar:hawar@localhost:5432/hawarmusic")
JWT_SECRET = os.environ.get("JWT_SECRET", "DEGISTIR-bu-anahtari-uretimde")
JWT_ALG = "HS256"
TOKEN_HOURS = int(os.environ.get("TOKEN_HOURS", str(24 * 30)))

STORAGE_DRIVER = os.environ.get("STORAGE_DRIVER", "local")  # local | s3
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads")
DEFAULT_MAX_FILE_MB = int(os.environ.get("MAX_FILE_MB", "50"))

ALLOWED_AUDIO_EXT = {".mp3", ".m4a", ".wav", ".flac", ".ogg", ".aac"}
ALLOWED_AUDIO_MIME = {
    "audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/m4a",
    "audio/wav", "audio/x-wav", "audio/flac", "audio/x-flac",
    "audio/ogg", "audio/aac", "application/octet-stream",
}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------------------------------------------------------- DB pool
_pool: Optional[asyncpg.Pool] = None


async def init_db():
    global _pool
    _pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)


async def close_db():
    if _pool:
        await _pool.close()


def pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB pool hazır değil")
    return _pool


# ---------------------------------------------------------------- Zaman / token
def now():
    return datetime.now(timezone.utc)


def hash_password(p: str) -> str:
    return pwd_context.hash(p)


def verify_password(p: str, h: str) -> bool:
    return pwd_context.verify(p, h)


def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": now() + timedelta(hours=TOKEN_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def gen_invite_code() -> str:
    return secrets.token_urlsafe(9)


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def valid_email(e: str) -> bool:
    return bool(EMAIL_RE.match(e or ""))


# ---------------------------------------------------------------- Auth bağımlılığı
async def get_current(authorization: Optional[str] = Header(None)) -> dict:
    """JWT'den kullanıcı + aktif aile üyeliğini çözer."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Giriş yapmanız gerekiyor")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        uid = payload.get("sub")
    except JWTError:
        raise HTTPException(401, "Oturum geçersiz")

    async with pool().acquire() as con:
        user = await con.fetchrow("SELECT * FROM users WHERE id = $1", uid)
        if not user:
            raise HTTPException(401, "Kullanıcı bulunamadı")
        member = await con.fetchrow(
            "SELECT * FROM family_members WHERE user_id = $1 ORDER BY joined_at LIMIT 1", uid
        )
    if not member:
        raise HTTPException(403, "Henüz bir aileye bağlı değilsiniz")

    return {
        "id": str(user["id"]),
        "email": user["email"],
        "display_name": user["display_name"],
        "avatar_color": user["avatar_color"],
        "family_id": str(member["family_id"]),
        "role": member["role"],
        "can_add_to_shared": member["can_add_to_shared"],
    }


async def get_current_flexible(authorization: Optional[str] = Header(None), t: Optional[str] = None) -> dict:
    """Header yoksa ?t=token query parametresini kabul eder (audio/img elementleri header gönderemez)."""
    if (not authorization) and t:
        authorization = f"Bearer {t}"
    return await get_current(authorization)


async def require_admin(user: dict = Depends(get_current)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(403, "Bu işlem için yönetici olmalısınız")
    return user


async def audit(con, family_id, user_id, action, detail=""):
    await con.execute(
        "INSERT INTO audit_logs (family_id, user_id, action, detail) VALUES ($1,$2,$3,$4)",
        family_id, user_id, action, detail[:1000],
    )
