"""
HawarMusic — demo veri tohumlama
Çalıştır: python -m src.seed   (DATABASE_URL ortam değişkeniyle)

Oluşturur:
- Aile: "Hawar Ailesi"
- Admin:  admin@hawarmusic.test / Admin1234
- Üye:    uye@hawarmusic.test   / Uye12345
- Örnek şarkı kartları (link tabanlı; dosya gerektirmez)
"""
import asyncio
from . import core, storage

DEMO_SONGS = [
    {"title": "Aşk Lafı", "artist": "Demo Sanatçı", "genre": "Pop", "year": 2021,
     "source": "youtube", "embed": "https://www.youtube.com/embed/dQw4w9WgXcQ",
     "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
     "cover_grad": "linear-gradient(135deg,#5b8cff,#a855f7)"},
    {"title": "Gece Yolculuğu", "artist": "Mavi Ses", "genre": "Elektronik", "year": 2022,
     "source": "spotify", "embed": "https://open.spotify.com/embed/track/11dFghVXANMlKmJXsNCbNl",
     "url": "https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl",
     "cover_grad": "linear-gradient(135deg,#8b5cf6,#ec4899)"},
    {"title": "Sahil Sabahı", "artist": "Deniz Korosu", "genre": "Akustik", "year": 2020,
     "source": "youtube", "embed": "https://www.youtube.com/embed/3JZ_D3ELwOQ",
     "url": "https://www.youtube.com/watch?v=3JZ_D3ELwOQ",
     "cover_grad": "linear-gradient(135deg,#06b6d4,#3b82f6)"},
    {"title": "Eski Defter", "artist": "Nostalji Grup", "genre": "Türk Halk", "year": 2019,
     "source": "spotify", "embed": "https://open.spotify.com/embed/track/7ouMYWpwJ422jRcDASZB7P",
     "url": "https://open.spotify.com/track/7ouMYWpwJ422jRcDASZB7P",
     "cover_grad": "linear-gradient(135deg,#f43f5e,#8b5cf6)"},
    {"title": "Yıldızlara", "artist": "Gece Modu", "genre": "Lo-fi", "year": 2023,
     "source": "youtube", "embed": "https://www.youtube.com/embed/jfKfPfyJRdk",
     "url": "https://www.youtube.com/watch?v=jfKfPfyJRdk",
     "cover_grad": "linear-gradient(135deg,#7c3aed,#2563eb)"},
]


async def main():
    await core.init_db()
    async with core.pool().acquire() as con:
        existing = await con.fetchval("SELECT 1 FROM users WHERE email='admin@hawarmusic.test'")
        if existing:
            print("Demo veri zaten var, atlanıyor.")
            return

        async with con.transaction():
            fam = await con.fetchrow("INSERT INTO families (name) VALUES ('Hawar Ailesi') RETURNING *")
            admin = await con.fetchrow(
                "INSERT INTO users (email,password_hash,display_name,avatar_color) "
                "VALUES ('admin@hawarmusic.test',$1,'Hawar (Admin)','#5b8cff') RETURNING *",
                core.hash_password("Admin1234"))
            member = await con.fetchrow(
                "INSERT INTO users (email,password_hash,display_name,avatar_color) "
                "VALUES ('uye@hawarmusic.test',$1,'Aile Üyesi','#ec4899') RETURNING *",
                core.hash_password("Uye12345"))
            await con.execute("INSERT INTO family_members (family_id,user_id,role) VALUES ($1,$2,'admin')",
                              fam["id"], admin["id"])
            await con.execute("INSERT INTO family_members (family_id,user_id,role) VALUES ($1,$2,'member')",
                              fam["id"], member["id"])
            await con.execute("INSERT INTO settings (family_id) VALUES ($1)", fam["id"])

            # davet kodu (yeni üyeler için)
            code = core.gen_invite_code()
            await con.execute(
                "INSERT INTO invitations (family_id,code,created_by,role) VALUES ($1,$2,$3,'member')",
                fam["id"], code, admin["id"])

            # örnek şarkılar
            for i, s in enumerate(DEMO_SONGS):
                uploader = admin["id"] if i % 2 == 0 else member["id"]
                await con.execute(
                    """INSERT INTO songs (family_id,uploaded_by,title,artist,genre,year,
                         cover_gradient,source_type,source_url,external_embed,
                         is_downloadable,license_confirmed,visibility,play_count)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,false,'family',$11)""",
                    fam["id"], uploader, s["title"], s["artist"], s["genre"], s["year"],
                    s["cover_grad"], s["source"], s["url"], s["embed"], (i * 7) % 40)

            # demo playlist
            pl = await con.fetchrow(
                "INSERT INTO playlists (family_id,owner_id,name,share,cover_gradient) "
                "VALUES ($1,$2,'Aile Favorileri','family',$3) RETURNING id",
                fam["id"], admin["id"], "linear-gradient(135deg,#0ea5e9,#6366f1)")
            songs = await con.fetch("SELECT id FROM songs WHERE family_id=$1 LIMIT 3", fam["id"])
            for pos, sg in enumerate(songs):
                await con.execute(
                    "INSERT INTO playlist_songs (playlist_id,song_id,position) VALUES ($1,$2,$3)",
                    pl["id"], sg["id"], pos)

            # demo istek
            await con.execute(
                "INSERT INTO song_requests (family_id,requested_by,text) VALUES ($1,$2,$3)",
                fam["id"], member["id"], "Dedemin sevdiği o eski türküyü ekleyebilir misiniz?")

    print("✓ Demo veri oluşturuldu")
    print("  Admin: admin@hawarmusic.test / Admin1234")
    print("  Üye:   uye@hawarmusic.test / Uye12345")
    print(f"  Davet kodu (yeni üye için): {code}")
    await core.close_db()


if __name__ == "__main__":
    asyncio.run(main())
