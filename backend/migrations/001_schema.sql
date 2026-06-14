-- ============================================================
-- HawarMusic by HawarSoftware
-- PostgreSQL şeması — 18 tablo
-- Aile grubu izolasyonu: tüm içerik family_id ile ayrılır
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- Aileler ----------
CREATE TABLE IF NOT EXISTS families (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(120) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Kullanıcılar ----------
CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    display_name   VARCHAR(120) NOT NULL,
    avatar_color   VARCHAR(20) DEFAULT '#5b8cff',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Aile üyelikleri (rol burada) ----------
-- role: admin | member
CREATE TABLE IF NOT EXISTS family_members (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL DEFAULT 'member',
    can_add_to_shared BOOLEAN NOT NULL DEFAULT true,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (family_id, user_id)
);

-- ---------- Davetler ----------
CREATE TABLE IF NOT EXISTS invitations (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    code         VARCHAR(40) NOT NULL UNIQUE,
    created_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(20) NOT NULL DEFAULT 'member',
    email        VARCHAR(255),
    used_by      UUID REFERENCES users(id),
    used_at      TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Sanatçılar & Albümler (opsiyonel normalizasyon) ----------
CREATE TABLE IF NOT EXISTS artists (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (family_id, name)
);

CREATE TABLE IF NOT EXISTS albums (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    artist_name VARCHAR(200),
    cover_path  VARCHAR(500),
    year        INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Şarkılar ----------
-- source_type: upload | direct_url | youtube | spotify | other
-- visibility:  private | family
CREATE TABLE IF NOT EXISTS songs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id         UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    uploaded_by       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(300) NOT NULL,
    artist            VARCHAR(200),
    album             VARCHAR(200),
    genre             VARCHAR(100),
    year              INT,
    duration          INT DEFAULT 0,            -- saniye
    file_path         VARCHAR(500),             -- depolama anahtarı (upload/direct_url)
    cover_path        VARCHAR(500),
    cover_gradient    VARCHAR(120),             -- kapak yoksa üretilen gradient
    source_type       VARCHAR(20) NOT NULL DEFAULT 'upload',
    source_url        VARCHAR(1000),
    external_embed    VARCHAR(1000),            -- youtube/spotify embed adresi
    is_downloadable   BOOLEAN NOT NULL DEFAULT true,
    license_confirmed BOOLEAN NOT NULL DEFAULT false,
    visibility        VARCHAR(20) NOT NULL DEFAULT 'family',
    file_size         BIGINT DEFAULT 0,
    play_count        INT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_songs_family ON songs(family_id);
CREATE INDEX IF NOT EXISTS idx_songs_uploader ON songs(uploaded_by);

-- ---------- Çalma listeleri ----------
-- share: private | family
CREATE TABLE IF NOT EXISTS playlists (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    cover_path  VARCHAR(500),
    cover_gradient VARCHAR(120),
    share       VARCHAR(20) NOT NULL DEFAULT 'private',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playlist_songs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id     UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position    INT NOT NULL DEFAULT 0,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (playlist_id, song_id)
);

-- ---------- Favoriler ----------
CREATE TABLE IF NOT EXISTS favorites (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id   UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, song_id)
);

-- ---------- Offline indirmeler (sunucu kaydı; asıl veri tarayıcıda) ----------
CREATE TABLE IF NOT EXISTS offline_downloads (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id   UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, song_id)
);

-- ---------- Şarkı istekleri ----------
-- status: open | fulfilled
CREATE TABLE IF NOT EXISTS song_requests (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text         VARCHAR(500) NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'open',
    fulfilled_by UUID REFERENCES users(id),
    fulfilled_song UUID REFERENCES songs(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Yorumlar ----------
CREATE TABLE IF NOT EXISTS comments (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id   UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text      VARCHAR(1000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Tepkiler (kalp vb.) ----------
CREATE TABLE IF NOT EXISTS reactions (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id   UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji     VARCHAR(16) NOT NULL DEFAULT '❤️',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (song_id, user_id, emoji)
);

-- ---------- Dinleme geçmişi ----------
CREATE TABLE IF NOT EXISTS listening_history (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id   UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_history_user ON listening_history(user_id, played_at DESC);

-- ---------- Import işleri (link import takibi) ----------
-- status: pending | done | failed
CREATE TABLE IF NOT EXISTS import_jobs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_url  VARCHAR(1000) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    result_song UUID REFERENCES songs(id),
    error       VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Denetim kayıtları ----------
CREATE TABLE IF NOT EXISTS audit_logs (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    action    VARCHAR(120) NOT NULL,
    detail    VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_family ON audit_logs(family_id, created_at DESC);

-- ---------- Ayarlar (aile başına) ----------
CREATE TABLE IF NOT EXISTS settings (
    family_id     UUID PRIMARY KEY REFERENCES families(id) ON DELETE CASCADE,
    max_file_mb   INT NOT NULL DEFAULT 50,
    allow_member_upload BOOLEAN NOT NULL DEFAULT true,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
