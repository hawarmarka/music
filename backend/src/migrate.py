"""SQL migration'larını sırayla uygula."""
import asyncio, asyncpg, os, pathlib

async def main():
    url = os.environ.get("DATABASE_URL", "postgresql://hawar:hawar@localhost:5432/hawarmusic")
    con = await asyncpg.connect(url)
    mig_dir = pathlib.Path(__file__).parent.parent / "migrations"
    for f in sorted(mig_dir.glob("*.sql")):
        sql = f.read_text()
        try:
            await con.execute(sql)
            print(f"  ✓ {f.name}")
        except asyncpg.exceptions.DuplicateTableError:
            print(f"  • {f.name} (tablolar zaten var)")
        except Exception as e:
            # idempotent: tablo varsa devam et
            if "already exists" in str(e):
                print(f"  • {f.name} (zaten uygulanmış)")
            else:
                raise
    await con.close()

if __name__ == "__main__":
    asyncio.run(main())
