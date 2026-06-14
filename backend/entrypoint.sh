#!/bin/sh
set -e
echo "→ Migration uygulanıyor..."
python -m src.migrate
echo "→ Demo veri (varsa atlanır)..."
python -m src.seed || true
echo "→ Sunucu başlıyor..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8000
