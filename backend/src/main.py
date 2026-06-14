"""
HawarMusic by HawarSoftware — ana API
FastAPI + PostgreSQL
"""
import io
import os
import asyncio
import uuid
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse, RedirectResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import core, storage

app = FastAPI(title="HawarMusic API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

store = None


@app.on_event("startup")
async def _startup():
    global store
    await core.init_db()
    store = storage.get_storage()


@app.on_event("shutdown")
async def _shutdown():
    await core.close_db()


# ============================================================ MODELLER
class RegisterIn(BaseModel):
    email: str
    password: str = Field(min_length=6)
    display_name: str = Field(min_length=2, max_length=120)
    invite_code: str  # davet kodu zorunlu (aile mantığı)


class CreateFamilyIn(BaseModel):
    email: str
    password: str = Field(min_length=6)
    display_name: str = Field(min_length=2, max_length=120)
    family_name: str = Field(min_length=2, max_length=120)


class LoginIn(BaseModel):
    email: str
    password: str


class InviteIn(BaseModel):
    role: str = "member"
    email: Optional[str] = None


class ImportLinkIn(BaseModel):
    url: str
    title: Optional[str] = None
    artist: Optional[str] = None
    license_confirmed: bool = False
    visibility: str = "family"


class SongEditIn(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    genre: Optional[str] = None
    year: Optional[int] = None
    visibility: Optional[str] = None


class PlaylistIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    share: str = "private"


class PlaylistSongIn(BaseModel):
    song_id: str


class ReorderIn(BaseModel):
    song_ids: List[str]


class RequestIn(BaseModel):
    text: str = Field(min_length=2, max_length=500)


class CommentIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class SettingsIn(BaseModel):
    max_file_mb: Optional[int] = None
    allow_member_upload: Optional[bool] = None


class MemberUpdateIn(BaseModel):
    role: Optional[str] = None  # admin | member
    can_add_to_shared: Optional[bool] = None


class ReactionIn(BaseModel):
    emoji: str = Field(default="❤️", max_length=16)


# ============================================================ YARDIMCI
def song_dict(r: dict, liked=False, like_count=0) -> dict:
    return {
        "id": str(r["id"]),
        "title": r["title"], "artist": r["artist"] or "", "album": r["album"] or "",
        "genre": r["genre"] or "", "year": r["year"], "duration": r["duration"] or 0,
        "source_type": r["source_type"], "source_url": r["source_url"],
        "external_embed": r["external_embed"],
        "cover_url": f"/api/songs/{r['id']}/cover" if r["cover_path"] else None,
        "cover_gradient": r["cover_gradient"] or storage.gradient_for(str(r["id"])),
        "stream_url": f"/api/songs/{r['id']}/stream" if r["file_path"] else None,
        "is_downloadable": r["is_downloadable"],
        "visibility": r["visibility"],
        "uploaded_by": str(r["uploaded_by"]), "uploaded_by_name": r.get("uploader_name", ""),
        "play_count": r["play_count"],
        "liked": liked, "like_count": like_count,
        "created_at": r["created_at"].isoformat(),
    }


# ============================================================ AUTH
@app.post("/api/auth/create-family")
async def create_family(data: CreateFamilyIn):
    """İlk admin + aile oluşturur (bootstrap)."""
    if not core.valid_email(data.email):
        raise HTTPException(400, "Geçerli bir e-posta girin")
    async with core.pool().acquire() as con:
        async with con.transaction():
            exists = await con.fetchval("SELECT 1 FROM users WHERE email=$1", data.email.lower())
            if exists:
                raise HTTPException(409, "Bu e-posta zaten kayıtlı")
            fam = await con.fetchrow("INSERT INTO families (name) VALUES ($1) RETURNING *", data.family_name)
            user = await con.fetchrow(
                "INSERT INTO users (email,password_hash,display_name) VALUES ($1,$2,$3) RETURNING *",
                data.email.lower(), core.hash_password(data.password), data.display_name,
            )
            await con.execute(
                "INSERT INTO family_members (family_id,user_id,role) VALUES ($1,$2,'admin')",
                fam["id"], user["id"],
            )
            await con.execute("INSERT INTO settings (family_id) VALUES ($1)", fam["id"])
            await core.audit(con, fam["id"], user["id"], "family.create", data.family_name)
    token = core.create_token(str(user["id"]))
    return {"token": token, "user": {"id": str(user["id"]), "email": user["email"],
            "display_name": user["display_name"], "role": "admin", "family_id": str(fam["id"])}}


@app.post("/api/auth/register")
async def register(data: RegisterIn):
    """Davet kodu ile kayıt."""
    if not core.valid_email(data.email):
        raise HTTPException(400, "Geçerli bir e-posta girin")
    async with core.pool().acquire() as con:
        inv = await con.fetchrow("SELECT * FROM invitations WHERE code=$1", data.invite_code)
        if not inv:
            raise HTTPException(404, "Davet kodu geçersiz")
        if inv["used_by"]:
            raise HTTPException(409, "Bu davet kodu zaten kullanılmış")
        if inv["expires_at"] and inv["expires_at"] < core.now():
            raise HTTPException(410, "Davet kodunun süresi dolmuş")
        exists = await con.fetchval("SELECT 1 FROM users WHERE email=$1", data.email.lower())
        if exists:
            raise HTTPException(409, "Bu e-posta zaten kayıtlı")
        async with con.transaction():
            user = await con.fetchrow(
                "INSERT INTO users (email,password_hash,display_name) VALUES ($1,$2,$3) RETURNING *",
                data.email.lower(), core.hash_password(data.password), data.display_name,
            )
            await con.execute(
                "INSERT INTO family_members (family_id,user_id,role) VALUES ($1,$2,$3)",
                inv["family_id"], user["id"], inv["role"],
            )
            await con.execute(
                "UPDATE invitations SET used_by=$1, used_at=now() WHERE id=$2",
                user["id"], inv["id"],
            )
            await core.audit(con, inv["family_id"], user["id"], "user.join", data.display_name)
    token = core.create_token(str(user["id"]))
    return {"token": token, "user": {"id": str(user["id"]), "email": user["email"],
            "display_name": user["display_name"], "role": inv["role"], "family_id": str(inv["family_id"])}}


@app.post("/api/auth/login")
async def login(data: LoginIn):
    async with core.pool().acquire() as con:
        user = await con.fetchrow("SELECT * FROM users WHERE email=$1", data.email.lower())
        if not user or not core.verify_password(data.password, user["password_hash"]):
            raise HTTPException(401, "E-posta veya şifre hatalı")
        member = await con.fetchrow(
            "SELECT * FROM family_members WHERE user_id=$1 ORDER BY joined_at LIMIT 1", user["id"])
    token = core.create_token(str(user["id"]))
    return {"token": token, "user": {"id": str(user["id"]), "email": user["email"],
            "display_name": user["display_name"], "avatar_color": user["avatar_color"],
            "role": member["role"] if member else None,
            "family_id": str(member["family_id"]) if member else None}}


@app.get("/api/auth/me")
async def me(user=Depends(core.get_current)):
    return user


# ============================================================ DAVETLER
@app.get("/api/invites")
async def list_invites(user=Depends(core.require_admin)):
    async with core.pool().acquire() as con:
        rows = await con.fetch(
            "SELECT * FROM invitations WHERE family_id=$1 ORDER BY created_at DESC", user["family_id"])
    return [{"id": str(r["id"]), "code": r["code"], "role": r["role"], "email": r["email"],
             "used": r["used_by"] is not None, "created_at": r["created_at"].isoformat()} for r in rows]


@app.post("/api/invites")
async def create_invite(data: InviteIn, user=Depends(core.require_admin)):
    code = core.gen_invite_code()
    async with core.pool().acquire() as con:
        await con.execute(
            "INSERT INTO invitations (family_id,code,created_by,role,email) VALUES ($1,$2,$3,$4,$5)",
            user["family_id"], code, user["id"], data.role, data.email)
        await core.audit(con, user["family_id"], user["id"], "invite.create", code)
    return {"code": code, "role": data.role, "register_path": f"/register?code={code}"}


# ============================================================ ŞARKILAR
@app.get("/api/songs")
async def list_songs(
    user=Depends(core.get_current),
    q: Optional[str] = None, source: Optional[str] = None, genre: Optional[str] = None,
):
    async with core.pool().acquire() as con:
        rows = await con.fetch(
            """SELECT s.*, u.display_name AS uploader_name,
                      (SELECT count(*) FROM favorites f WHERE f.song_id=s.id) AS like_count,
                      EXISTS(SELECT 1 FROM favorites f WHERE f.song_id=s.id AND f.user_id=$2) AS liked
               FROM songs s JOIN users u ON u.id=s.uploaded_by
               WHERE s.family_id=$1
                 AND (s.visibility='family' OR s.uploaded_by=$2)
               ORDER BY s.created_at DESC""",
            user["family_id"], user["id"])
    items = []
    for r in rows:
        d = dict(r)
        if q and q.lower() not in (f"{r['title']} {r['artist']} {r['album']} {r['uploader_name']}").lower():
            continue
        if source and r["source_type"] != source:
            continue
        if genre and (r["genre"] or "").lower() != genre.lower():
            continue
        items.append(song_dict(d, liked=r["liked"], like_count=r["like_count"]))
    return items


@app.post("/api/songs/upload")
async def upload_song(
    file: UploadFile = File(...),
    title: str = Form(""), artist: str = Form(""), album: str = Form(""),
    genre: str = Form(""), year: Optional[int] = Form(None),
    visibility: str = Form("family"),
    user=Depends(core.get_current),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in core.ALLOWED_AUDIO_EXT:
        raise HTTPException(400, f"Desteklenmeyen format. İzinli: {', '.join(sorted(core.ALLOWED_AUDIO_EXT))}")
    if file.content_type and file.content_type not in core.ALLOWED_AUDIO_MIME:
        raise HTTPException(400, f"Geçersiz dosya türü: {file.content_type}")

    # ayarlardan boyut sınırı
    async with core.pool().acquire() as con:
        s = await con.fetchrow("SELECT * FROM settings WHERE family_id=$1", user["family_id"])
        max_mb = s["max_file_mb"] if s else core.DEFAULT_MAX_FILE_MB
        if s and not s["allow_member_upload"] and user["role"] != "admin":
            raise HTTPException(403, "Yöneticiniz üye yüklemelerini kapatmış")

    data = await file.read()
    if len(data) > max_mb * 1024 * 1024:
        raise HTTPException(413, f"Dosya {max_mb}MB sınırını aşıyor")

    # metadata oku (mutagen)
    meta = read_audio_meta(data, ext)
    final_title = title or meta.get("title") or Path(file.filename or "Şarkı").stem
    final_artist = artist or meta.get("artist") or ""
    final_album = album or meta.get("album") or ""
    duration = meta.get("duration", 0)
    cover_bytes = meta.get("cover")

    key = storage.new_key(user["family_id"], ext)
    store.save_bytes(key, data)

    cover_key = None
    if cover_bytes:
        cover_key = storage.new_key(user["family_id"], ".jpg")
        store.save_bytes(cover_key, cover_bytes)

    async with core.pool().acquire() as con:
        row = await con.fetchrow(
            """INSERT INTO songs (family_id,uploaded_by,title,artist,album,genre,year,duration,
                 file_path,cover_path,cover_gradient,source_type,is_downloadable,license_confirmed,
                 visibility,file_size)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'upload',true,true,$12,$13)
               RETURNING *, (SELECT display_name FROM users WHERE id=$2) AS uploader_name""",
            user["family_id"], user["id"], final_title, final_artist, final_album,
            genre or meta.get("genre", ""), year or meta.get("year"), duration,
            key, cover_key, storage.gradient_for(final_title),
            visibility, len(data))
        await core.audit(con, user["family_id"], user["id"], "song.upload", final_title)
    return song_dict(dict(row), like_count=0)


@app.post("/api/songs/import")
async def import_link(data: ImportLinkIn, user=Depends(core.get_current)):
    info = storage.classify_link(data.url)
    if info["kind"] == "invalid":
        raise HTTPException(400, info.get("reason", "Geçersiz bağlantı"))

    async with core.pool().acquire() as con:
        job = await con.fetchrow(
            "INSERT INTO import_jobs (family_id,user_id,source_url) VALUES ($1,$2,$3) RETURNING id",
            user["family_id"], user["id"], data.url)
        job_id = job["id"]

    # --- YouTube / Spotify: sadece metadata, indirme YOK ---
    if info["kind"] in ("youtube", "spotify"):
        title, artist = data.title or "", data.artist or ""
        if info["kind"] == "youtube" and not title:
            ymeta = await storage.fetch_youtube_meta(info["external_id"])
            title = title or ymeta["title"]
            artist = artist or ymeta["artist"]
        title = title or ("YouTube parçası" if info["kind"] == "youtube" else "Spotify parçası")
        async with core.pool().acquire() as con:
            row = await con.fetchrow(
                """INSERT INTO songs (family_id,uploaded_by,title,artist,cover_gradient,
                     source_type,source_url,external_embed,is_downloadable,license_confirmed,visibility)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,false,$9)
                   RETURNING *, (SELECT display_name FROM users WHERE id=$2) AS uploader_name""",
                user["family_id"], user["id"], title, artist,
                storage.gradient_for(title), info["kind"], info["external_url"], info["embed"],
                data.visibility)
            await con.execute("UPDATE import_jobs SET status='done', result_song=$1 WHERE id=$2",
                              row["id"], job_id)
            await core.audit(con, user["family_id"], user["id"], "song.import_meta", title)
        d = song_dict(dict(row))
        d["cover_url"] = info.get("cover")
        d["notice"] = "Bu platformdan ses dosyası indirilemez, sadece koleksiyona bağlantı olarak eklendi."
        return d

    # --- Doğrudan ses URL'si: indirme için onay zorunlu ---
    if info["kind"] == "direct_url":
        if not data.license_confirmed:
            async with core.pool().acquire() as con:
                await con.execute("UPDATE import_jobs SET status='failed', error=$1 WHERE id=$2",
                                  "Onay verilmedi", job_id)
            raise HTTPException(400, "Bu içeriği indirme/yükleme hakkına sahip olduğunuzu onaylamalısınız")
        async with core.pool().acquire() as con:
            s = await con.fetchrow("SELECT max_file_mb FROM settings WHERE family_id=$1", user["family_id"])
            max_mb = s["max_file_mb"] if s else core.DEFAULT_MAX_FILE_MB
        try:
            audio = await storage.download_audio(info["external_url"], max_mb * 1024 * 1024)
        except Exception as e:
            async with core.pool().acquire() as con:
                await con.execute("UPDATE import_jobs SET status='failed', error=$1 WHERE id=$2",
                                  str(e)[:500], job_id)
            raise HTTPException(400, f"İndirme başarısız: {e}")

        ext = info["ext"]
        meta = read_audio_meta(audio, ext)
        title = data.title or meta.get("title") or "İçe aktarılan şarkı"
        key = storage.new_key(user["family_id"], ext)
        store.save_bytes(key, audio)
        async with core.pool().acquire() as con:
            row = await con.fetchrow(
                """INSERT INTO songs (family_id,uploaded_by,title,artist,album,duration,
                     file_path,cover_gradient,source_type,source_url,is_downloadable,license_confirmed,
                     visibility,file_size)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'direct_url',$9,true,true,$10,$11)
                   RETURNING *, (SELECT display_name FROM users WHERE id=$2) AS uploader_name""",
                user["family_id"], user["id"], title, data.artist or meta.get("artist", ""),
                meta.get("album", ""), meta.get("duration", 0), key,
                storage.gradient_for(title), info["external_url"], data.visibility, len(audio))
            await con.execute("UPDATE import_jobs SET status='done', result_song=$1 WHERE id=$2",
                              row["id"], job_id)
            await core.audit(con, user["family_id"], user["id"], "song.import_file", title)
        return song_dict(dict(row))


@app.get("/api/songs/{song_id}/stream")
async def stream_song(song_id: str, user=Depends(core.get_current_flexible)):
    async with core.pool().acquire() as con:
        r = await con.fetchrow("SELECT * FROM songs WHERE id=$1 AND family_id=$2", song_id, user["family_id"])
        if not r or not r["file_path"]:
            raise HTTPException(404, "Şarkı bulunamadı")
        await con.execute("UPDATE songs SET play_count=play_count+1 WHERE id=$1", song_id)
        await con.execute("INSERT INTO listening_history (user_id,song_id) VALUES ($1,$2)", user["id"], song_id)

    # S3 ise signed URL'e yönlendir
    if core.STORAGE_DRIVER == "s3":
        return RedirectResponse(store.signed_url(r["file_path"]))
    ext = Path(r["file_path"]).suffix.lower()
    media = {".mp3":"audio/mpeg",".m4a":"audio/mp4",".wav":"audio/wav",
             ".flac":"audio/flac",".ogg":"audio/ogg",".aac":"audio/aac"}.get(ext,"application/octet-stream")
    path = Path(core.UPLOAD_DIR) / r["file_path"]
    if not path.exists():
        raise HTTPException(404, "Dosya bulunamadı")
    # FileResponse tarayıcıların Range isteklerini destekler; bu sayede seek/ileri-geri sarma daha stabil olur.
    return FileResponse(path, media_type=media, filename=f"{r['title']}{ext}")


@app.get("/api/songs/{song_id}/cover")
async def song_cover(song_id: str, user=Depends(core.get_current_flexible)):
    async with core.pool().acquire() as con:
        r = await con.fetchrow("SELECT cover_path,family_id FROM songs WHERE id=$1", song_id)
    if not r or not r["cover_path"] or str(r["family_id"]) != user["family_id"]:
        raise HTTPException(404, "Kapak yok")
    if core.STORAGE_DRIVER == "s3":
        return RedirectResponse(store.signed_url(r["cover_path"]))
    stream, _ = store.open_stream(r["cover_path"])
    if not stream:
        raise HTTPException(404, "Kapak yok")
    return StreamingResponse(stream, media_type="image/jpeg")


@app.patch("/api/songs/{song_id}")
async def edit_song(song_id: str, data: SongEditIn, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        r = await con.fetchrow("SELECT * FROM songs WHERE id=$1 AND family_id=$2", song_id, user["family_id"])
        if not r:
            raise HTTPException(404, "Şarkı bulunamadı")
        if r["uploaded_by"] != uuid.UUID(user["id"]) and user["role"] != "admin":
            raise HTTPException(403, "Bu şarkıyı düzenleyemezsiniz")
        fields, values, i = [], [], 1
        for col in ["title", "artist", "album", "genre", "year", "visibility"]:
            v = getattr(data, col)
            if v is not None:
                fields.append(f"{col}=${i}"); values.append(v); i += 1
        if not fields:
            return song_dict(dict(r))
        values.extend([song_id, user["family_id"]])
        row = await con.fetchrow(
            f"""UPDATE songs SET {','.join(fields)}, updated_at=now()
                WHERE id=${i} AND family_id=${i+1}
                RETURNING *, (SELECT display_name FROM users WHERE id=uploaded_by) AS uploader_name""",
            *values)
    return song_dict(dict(row))


@app.delete("/api/songs/{song_id}")
async def delete_song(song_id: str, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        r = await con.fetchrow("SELECT * FROM songs WHERE id=$1 AND family_id=$2", song_id, user["family_id"])
        if not r:
            raise HTTPException(404, "Şarkı bulunamadı")
        if r["uploaded_by"] != uuid.UUID(user["id"]) and user["role"] != "admin":
            raise HTTPException(403, "Bu şarkıyı silemezsiniz")
        if r["file_path"]:
            store.delete(r["file_path"])
        if r["cover_path"]:
            store.delete(r["cover_path"])
        await con.execute("DELETE FROM songs WHERE id=$1", song_id)
        await core.audit(con, user["family_id"], user["id"], "song.delete", r["title"])
    return {"ok": True}


@app.post("/api/songs/{song_id}/favorite")
async def toggle_favorite(song_id: str, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        song = await con.fetchrow("SELECT id FROM songs WHERE id=$1 AND family_id=$2", song_id, user["family_id"])
        if not song:
            raise HTTPException(404, "Şarkı bulunamadı")
        exists = await con.fetchval(
            "SELECT 1 FROM favorites WHERE user_id=$1 AND song_id=$2", user["id"], song_id)
        if exists:
            await con.execute("DELETE FROM favorites WHERE user_id=$1 AND song_id=$2", user["id"], song_id)
            liked = False
        else:
            await con.execute("INSERT INTO favorites (user_id,song_id) VALUES ($1,$2)", user["id"], song_id)
            liked = True
        cnt = await con.fetchval("SELECT count(*) FROM favorites WHERE song_id=$1", song_id)
    return {"liked": liked, "like_count": cnt}


@app.get("/api/songs/{song_id}/reactions")
async def list_reactions(song_id: str, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        song = await con.fetchrow("SELECT id FROM songs WHERE id=$1 AND family_id=$2", song_id, user["family_id"])
        if not song:
            raise HTTPException(404, "Şarkı bulunamadı")
        rows = await con.fetch(
            """SELECT emoji, count(*) AS count, bool_or(user_id=$2) AS mine
               FROM reactions WHERE song_id=$1 GROUP BY emoji ORDER BY count DESC, emoji""",
            song_id, user["id"])
    return [{"emoji": r["emoji"], "count": r["count"], "mine": r["mine"]} for r in rows]


@app.post("/api/songs/{song_id}/reactions")
async def toggle_reaction(song_id: str, data: ReactionIn, user=Depends(core.get_current)):
    emoji = (data.emoji or "❤️")[:16]
    async with core.pool().acquire() as con:
        song = await con.fetchrow("SELECT id FROM songs WHERE id=$1 AND family_id=$2", song_id, user["family_id"])
        if not song:
            raise HTTPException(404, "Şarkı bulunamadı")
        exists = await con.fetchval(
            "SELECT 1 FROM reactions WHERE song_id=$1 AND user_id=$2 AND emoji=$3", song_id, user["id"], emoji)
        if exists:
            await con.execute("DELETE FROM reactions WHERE song_id=$1 AND user_id=$2 AND emoji=$3", song_id, user["id"], emoji)
            active = False
        else:
            await con.execute("INSERT INTO reactions (song_id,user_id,emoji) VALUES ($1,$2,$3)", song_id, user["id"], emoji)
            active = True
        rows = await con.fetch(
            """SELECT emoji, count(*) AS count, bool_or(user_id=$2) AS mine
               FROM reactions WHERE song_id=$1 GROUP BY emoji ORDER BY count DESC, emoji""",
            song_id, user["id"])
    return {"active": active, "items": [{"emoji": r["emoji"], "count": r["count"], "mine": r["mine"]} for r in rows]}


# ============================================================ ÇALMA LİSTELERİ
@app.get("/api/playlists")
async def list_playlists(user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        rows = await con.fetch(
            """SELECT p.*, u.display_name AS owner_name,
                  (SELECT count(*) FROM playlist_songs ps WHERE ps.playlist_id=p.id) AS song_count
               FROM playlists p JOIN users u ON u.id=p.owner_id
               WHERE p.family_id=$1 AND (p.share='family' OR p.owner_id=$2)
               ORDER BY p.created_at DESC""",
            user["family_id"], user["id"])
    return [{"id": str(r["id"]), "name": r["name"], "share": r["share"],
             "owner_id": str(r["owner_id"]), "owner_name": r["owner_name"],
             "cover_gradient": r["cover_gradient"] or storage.gradient_for(str(r["id"])),
             "song_count": r["song_count"], "created_at": r["created_at"].isoformat()} for r in rows]


@app.post("/api/playlists")
async def create_playlist(data: PlaylistIn, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        r = await con.fetchrow(
            """INSERT INTO playlists (family_id,owner_id,name,share,cover_gradient)
               VALUES ($1,$2,$3,$4,$5) RETURNING *""",
            user["family_id"], user["id"], data.name, data.share, storage.gradient_for(data.name))
    return {"id": str(r["id"]), "name": r["name"], "share": r["share"],
            "owner_id": str(r["owner_id"]), "owner_name": user["display_name"],
            "cover_gradient": r["cover_gradient"], "song_count": 0,
            "created_at": r["created_at"].isoformat()}


@app.get("/api/playlists/{pid}")
async def playlist_detail(pid: str, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        p = await con.fetchrow(
            "SELECT p.*, u.display_name AS owner_name FROM playlists p JOIN users u ON u.id=p.owner_id "
            "WHERE p.id=$1 AND p.family_id=$2", pid, user["family_id"])
        if not p or (p["share"] != "family" and p["owner_id"] != uuid.UUID(user["id"])):
            raise HTTPException(404, "Çalma listesi bulunamadı")
        rows = await con.fetch(
            """SELECT s.*, u.display_name AS uploader_name, ps.position,
                      (SELECT count(*) FROM favorites f WHERE f.song_id=s.id) AS like_count,
                      EXISTS(SELECT 1 FROM favorites f WHERE f.song_id=s.id AND f.user_id=$2) AS liked
               FROM playlist_songs ps JOIN songs s ON s.id=ps.song_id
               JOIN users u ON u.id=s.uploaded_by
               WHERE ps.playlist_id=$1 ORDER BY ps.position""",
            pid, user["id"])
    songs = [song_dict(dict(r), liked=r["liked"], like_count=r["like_count"]) for r in rows]
    return {"id": str(p["id"]), "name": p["name"], "share": p["share"],
            "owner_id": str(p["owner_id"]), "owner_name": p["owner_name"],
            "cover_gradient": p["cover_gradient"] or storage.gradient_for(str(p["id"])),
            "songs": songs}


@app.post("/api/playlists/{pid}/songs")
async def playlist_add(pid: str, data: PlaylistSongIn, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        p = await con.fetchrow("SELECT * FROM playlists WHERE id=$1 AND family_id=$2", pid, user["family_id"])
        if not p or p["owner_id"] != uuid.UUID(user["id"]):
            raise HTTPException(403, "Sadece kendi listenize ekleyebilirsiniz")
        song = await con.fetchrow("SELECT id FROM songs WHERE id=$1 AND family_id=$2", data.song_id, user["family_id"])
        if not song:
            raise HTTPException(404, "Şarkı bulunamadı")
        pos = await con.fetchval(
            "SELECT coalesce(max(position),0)+1 FROM playlist_songs WHERE playlist_id=$1", pid)
        await con.execute(
            "INSERT INTO playlist_songs (playlist_id,song_id,position) VALUES ($1,$2,$3) "
            "ON CONFLICT (playlist_id,song_id) DO NOTHING", pid, data.song_id, pos)
    return {"ok": True}


@app.delete("/api/playlists/{pid}/songs/{song_id}")
async def playlist_remove(pid: str, song_id: str, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        p = await con.fetchrow("SELECT * FROM playlists WHERE id=$1 AND family_id=$2", pid, user["family_id"])
        if not p or p["owner_id"] != uuid.UUID(user["id"]):
            raise HTTPException(403, "İzin yok")
        await con.execute("DELETE FROM playlist_songs WHERE playlist_id=$1 AND song_id=$2", pid, song_id)
    return {"ok": True}


@app.post("/api/playlists/{pid}/reorder")
async def playlist_reorder(pid: str, data: ReorderIn, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        p = await con.fetchrow("SELECT * FROM playlists WHERE id=$1 AND family_id=$2", pid, user["family_id"])
        if not p or p["owner_id"] != uuid.UUID(user["id"]):
            raise HTTPException(403, "İzin yok")
        for pos, sid in enumerate(data.song_ids):
            await con.execute(
                "UPDATE playlist_songs SET position=$1 WHERE playlist_id=$2 AND song_id=$3", pos, pid, sid)
    return {"ok": True}


@app.delete("/api/playlists/{pid}")
async def delete_playlist(pid: str, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        p = await con.fetchrow("SELECT * FROM playlists WHERE id=$1 AND family_id=$2", pid, user["family_id"])
        if not p or (p["owner_id"] != uuid.UUID(user["id"]) and user["role"] != "admin"):
            raise HTTPException(403, "İzin yok")
        await con.execute("DELETE FROM playlists WHERE id=$1", pid)
    return {"ok": True}


# ============================================================ FAVORİLER / OFFLINE / GEÇMİŞ
@app.get("/api/favorites")
async def my_favorites(user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        rows = await con.fetch(
            """SELECT s.*, u.display_name AS uploader_name,
                  (SELECT count(*) FROM favorites f WHERE f.song_id=s.id) AS like_count
               FROM favorites fav JOIN songs s ON s.id=fav.song_id
               JOIN users u ON u.id=s.uploaded_by
               WHERE fav.user_id=$1 ORDER BY fav.created_at DESC""", user["id"])
    return [song_dict(dict(r), liked=True, like_count=r["like_count"]) for r in rows]


@app.get("/api/history/recent")
async def recent(user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        rows = await con.fetch(
            """SELECT DISTINCT ON (s.id) s.*, u.display_name AS uploader_name,
                  (SELECT count(*) FROM favorites f WHERE f.song_id=s.id) AS like_count,
                  EXISTS(SELECT 1 FROM favorites f WHERE f.song_id=s.id AND f.user_id=$1) AS liked,
                  h.played_at
               FROM listening_history h JOIN songs s ON s.id=h.song_id
               JOIN users u ON u.id=s.uploaded_by
               WHERE h.user_id=$1 ORDER BY s.id, h.played_at DESC LIMIT 20""", user["id"])
    rows = sorted(rows, key=lambda r: r["played_at"], reverse=True)
    return [song_dict(dict(r), liked=r["liked"], like_count=r["like_count"]) for r in rows]


@app.get("/api/offline")
async def offline_list(user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        rows = await con.fetch(
            """SELECT s.*, u.display_name AS uploader_name,
                  (SELECT count(*) FROM favorites f WHERE f.song_id=s.id) AS like_count
               FROM offline_downloads o JOIN songs s ON s.id=o.song_id
               JOIN users u ON u.id=s.uploaded_by
               WHERE o.user_id=$1 ORDER BY o.created_at DESC""", user["id"])
    return [song_dict(dict(r), like_count=r["like_count"]) for r in rows]


@app.post("/api/offline/{song_id}")
async def offline_mark(song_id: str, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        r = await con.fetchrow("SELECT is_downloadable FROM songs WHERE id=$1 AND family_id=$2",
                               song_id, user["family_id"])
        if not r:
            raise HTTPException(404, "Şarkı bulunamadı")
        if not r["is_downloadable"]:
            raise HTTPException(400, "Bu kaynak offline indirilemez")
        await con.execute(
            "INSERT INTO offline_downloads (user_id,song_id) VALUES ($1,$2) "
            "ON CONFLICT (user_id,song_id) DO NOTHING", user["id"], song_id)
    return {"ok": True}


@app.delete("/api/offline/{song_id}")
async def offline_remove(song_id: str, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        await con.execute("DELETE FROM offline_downloads WHERE user_id=$1 AND song_id=$2", user["id"], song_id)
    return {"ok": True}


# ============================================================ İSTEKLER / YORUM / TEPKİ
@app.get("/api/requests")
async def list_requests(user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        rows = await con.fetch(
            """SELECT r.*, u.display_name AS requester_name
               FROM song_requests r JOIN users u ON u.id=r.requested_by
               WHERE r.family_id=$1 ORDER BY r.created_at DESC""", user["family_id"])
    return [{"id": str(r["id"]), "text": r["text"], "status": r["status"],
             "requester_name": r["requester_name"], "created_at": r["created_at"].isoformat()} for r in rows]


@app.post("/api/requests")
async def create_request(data: RequestIn, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        r = await con.fetchrow(
            "INSERT INTO song_requests (family_id,requested_by,text) VALUES ($1,$2,$3) RETURNING *",
            user["family_id"], user["id"], data.text)
    return {"id": str(r["id"]), "text": r["text"], "status": "open",
            "requester_name": user["display_name"], "created_at": r["created_at"].isoformat()}


@app.post("/api/requests/{rid}/fulfill")
async def fulfill_request(rid: str, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        await con.execute(
            "UPDATE song_requests SET status='fulfilled', fulfilled_by=$1 WHERE id=$2 AND family_id=$3",
            user["id"], rid, user["family_id"])
    return {"ok": True}


@app.get("/api/songs/{song_id}/comments")
async def list_comments(song_id: str, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        song = await con.fetchrow("SELECT id FROM songs WHERE id=$1 AND family_id=$2", song_id, user["family_id"])
        if not song:
            raise HTTPException(404, "Şarkı bulunamadı")
        rows = await con.fetch(
            """SELECT c.*, u.display_name AS author FROM comments c JOIN users u ON u.id=c.user_id
               WHERE c.song_id=$1 ORDER BY c.created_at""", song_id)
    return [{"id": str(r["id"]), "text": r["text"], "author": r["author"],
             "created_at": r["created_at"].isoformat()} for r in rows]


@app.post("/api/songs/{song_id}/comments")
async def add_comment(song_id: str, data: CommentIn, user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        song = await con.fetchrow("SELECT id,title FROM songs WHERE id=$1 AND family_id=$2", song_id, user["family_id"])
        if not song:
            raise HTTPException(404, "Şarkı bulunamadı")
        r = await con.fetchrow(
            "INSERT INTO comments (song_id,user_id,text) VALUES ($1,$2,$3) RETURNING *", song_id, user["id"], data.text)
        await core.audit(con, user["family_id"], user["id"], "comment.add", song["title"])
    return {"id": str(r["id"]), "text": r["text"], "author": user["display_name"],
            "created_at": r["created_at"].isoformat()}


# ============================================================ AİLE / ÜYELER
@app.get("/api/family/members")
async def family_members(user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        rows = await con.fetch(
            """SELECT fm.role, fm.can_add_to_shared, fm.joined_at, u.id, u.display_name, u.email, u.avatar_color,
                  (SELECT count(*) FROM songs s WHERE s.uploaded_by=u.id AND s.family_id=$1) AS song_count
               FROM family_members fm JOIN users u ON u.id=fm.user_id
               WHERE fm.family_id=$1 ORDER BY fm.joined_at""", user["family_id"])
    return [{"id": str(r["id"]), "display_name": r["display_name"], "email": r["email"],
             "role": r["role"], "avatar_color": r["avatar_color"], "song_count": r["song_count"],
             "can_add_to_shared": r["can_add_to_shared"],
             "joined_at": r["joined_at"].isoformat()} for r in rows]


@app.patch("/api/family/members/{member_user_id}")
async def update_member(member_user_id: str, data: MemberUpdateIn, user=Depends(core.require_admin)):
    if member_user_id == user["id"] and data.role == "member":
        raise HTTPException(400, "Kendi yönetici rolünüzü düşüremezsiniz")
    fields, values, i = [], [], 1
    if data.role is not None:
        if data.role not in ("admin", "member"):
            raise HTTPException(400, "Rol admin veya member olmalı")
        fields.append(f"role=${i}"); values.append(data.role); i += 1
    if data.can_add_to_shared is not None:
        fields.append(f"can_add_to_shared=${i}"); values.append(data.can_add_to_shared); i += 1
    if not fields:
        raise HTTPException(400, "Güncellenecek alan yok")
    values.extend([user["family_id"], member_user_id])
    async with core.pool().acquire() as con:
        r = await con.fetchrow(
            f"""UPDATE family_members SET {','.join(fields)}
                WHERE family_id=${i} AND user_id=${i+1}
                RETURNING user_id, role, can_add_to_shared""", *values)
        if not r:
            raise HTTPException(404, "Üye bulunamadı")
        await core.audit(con, user["family_id"], user["id"], "member.update", str(member_user_id))
    return {"ok": True, "role": r["role"], "can_add_to_shared": r["can_add_to_shared"]}


@app.delete("/api/family/members/{member_user_id}")
async def remove_member(member_user_id: str, user=Depends(core.require_admin)):
    if member_user_id == user["id"]:
        raise HTTPException(400, "Kendinizi aileden çıkaramazsınız")
    async with core.pool().acquire() as con:
        r = await con.fetchrow(
            "DELETE FROM family_members WHERE family_id=$1 AND user_id=$2 RETURNING user_id",
            user["family_id"], member_user_id)
        if not r:
            raise HTTPException(404, "Üye bulunamadı")
        await core.audit(con, user["family_id"], user["id"], "member.remove", str(member_user_id))
    return {"ok": True}


# ============================================================ ADMIN
@app.get("/api/admin/dashboard")
async def admin_dashboard(user=Depends(core.require_admin)):
    async with core.pool().acquire() as con:
        songs = await con.fetchval("SELECT count(*) FROM songs WHERE family_id=$1", user["family_id"])
        users = await con.fetchval("SELECT count(*) FROM family_members WHERE family_id=$1", user["family_id"])
        storage_bytes = await con.fetchval(
            "SELECT coalesce(sum(file_size),0) FROM songs WHERE family_id=$1", user["family_id"])
        top = await con.fetch(
            "SELECT title,artist,play_count FROM songs WHERE family_id=$1 ORDER BY play_count DESC LIMIT 5",
            user["family_id"])
        recent = await con.fetch(
            """SELECT s.title, s.created_at, u.display_name AS uploader
               FROM songs s JOIN users u ON u.id=s.uploaded_by
               WHERE s.family_id=$1 ORDER BY s.created_at DESC LIMIT 5""", user["family_id"])
    return {
        "total_songs": songs, "total_users": users,
        "storage_mb": round(storage_bytes / 1024 / 1024, 1),
        "top_played": [{"title": r["title"], "artist": r["artist"], "play_count": r["play_count"]} for r in top],
        "recent_uploads": [{"title": r["title"], "uploader": r["uploader"],
                            "created_at": r["created_at"].isoformat()} for r in recent],
    }


@app.get("/api/admin/logs")
async def admin_logs(user=Depends(core.require_admin)):
    async with core.pool().acquire() as con:
        rows = await con.fetch(
            """SELECT a.action, a.detail, a.created_at, u.display_name
               FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
               WHERE a.family_id=$1 ORDER BY a.created_at DESC LIMIT 100""", user["family_id"])
    return [{"action": r["action"], "detail": r["detail"], "user": r["display_name"],
             "created_at": r["created_at"].isoformat()} for r in rows]


@app.get("/api/settings")
async def get_settings(user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        s = await con.fetchrow("SELECT * FROM settings WHERE family_id=$1", user["family_id"])
    return {"max_file_mb": s["max_file_mb"], "allow_member_upload": s["allow_member_upload"]}


@app.patch("/api/settings")
async def update_settings(data: SettingsIn, user=Depends(core.require_admin)):
    async with core.pool().acquire() as con:
        fields, values, i = [], [], 1
        if data.max_file_mb is not None:
            fields.append(f"max_file_mb=${i}"); values.append(data.max_file_mb); i += 1
        if data.allow_member_upload is not None:
            fields.append(f"allow_member_upload=${i}"); values.append(data.allow_member_upload); i += 1
        if fields:
            values.append(user["family_id"])
            await con.execute(
                f"UPDATE settings SET {','.join(fields)}, updated_at=now() WHERE family_id=${i}", *values)
        s = await con.fetchrow("SELECT * FROM settings WHERE family_id=$1", user["family_id"])
    return {"max_file_mb": s["max_file_mb"], "allow_member_upload": s["allow_member_upload"]}


@app.get("/api/notifications")
async def notifications(user=Depends(core.get_current)):
    async with core.pool().acquire() as con:
        rows = await con.fetch(
            """SELECT a.action, a.detail, a.created_at, u.display_name
               FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
               WHERE a.family_id=$1 ORDER BY a.created_at DESC LIMIT 30""", user["family_id"])
    return [{"action": r["action"], "detail": r["detail"], "user": r["display_name"],
             "created_at": r["created_at"].isoformat()} for r in rows]


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "hawarmusic"}


# ============================================================ METADATA OKUMA
def read_audio_meta(data: bytes, ext: str) -> dict:
    """mutagen ile başlık/sanatçı/albüm/süre/kapak çıkar."""
    out = {"title": "", "artist": "", "album": "", "genre": "", "year": None, "duration": 0, "cover": None}
    try:
        from mutagen import File as MFile
        mf = MFile(io.BytesIO(data))
        if mf is None:
            return out
        if mf.info and getattr(mf.info, "length", None):
            out["duration"] = int(mf.info.length)
        def g(*keys):
            for k in keys:
                if mf.tags and k in mf.tags:
                    v = mf.tags[k]
                    return str(v[0]) if isinstance(v, list) else str(v)
            return ""
        out["title"] = g("TIT2", "title", "\xa9nam")
        out["artist"] = g("TPE1", "artist", "\xa9ART")
        out["album"] = g("TALB", "album", "\xa9alb")
        out["genre"] = g("TCON", "genre", "\xa9gen")
        yr = g("TDRC", "date", "\xa9day")
        if yr[:4].isdigit():
            out["year"] = int(yr[:4])
        # kapak
        try:
            if mf.tags:
                for k in mf.tags.keys():
                    if k.startswith("APIC"):
                        out["cover"] = mf.tags[k].data; break
                if not out["cover"] and "covr" in mf.tags:
                    out["cover"] = bytes(mf.tags["covr"][0])
        except Exception:
            pass
    except Exception:
        pass
    return out
