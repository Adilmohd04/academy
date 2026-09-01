-- ============================================================================
-- Certificate PDF artifact storage
-- ---------------------------------------------------------------------------
-- Run after the certificate lifecycle migrations. The active issuer stores
-- QR-bearing PDFs in this bucket and records the public object URL in
-- certificates.pdf_url.
--
-- The existing student experience opens `pdf_url` directly, so this preserves
-- the repository's established public-certificate contract. Object names are
-- opaque UUID/code capability paths; do not place internal IDs or user-supplied
-- file names in this bucket. For a private-PDF deployment, replace direct
-- pdf_url delivery with an authenticated signed-download endpoint first.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;
