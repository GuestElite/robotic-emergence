#!/usr/bin/env bash
# Exécute un fichier SQL sur la DB Supabase via la Management API.
# Usage : ./db/run-migration.sh db/migrations/2026-05-13-unit-skins.sql
set -euo pipefail

SQL_FILE="${1:-}"
if [[ -z "$SQL_FILE" || ! -f "$SQL_FILE" ]]; then
  echo "Usage: $0 <fichier.sql>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erreur: .env introuvable à $ENV_FILE" >&2
  exit 1
fi
# shellcheck source=/dev/null
set -a; source "$ENV_FILE"; set +a

: "${SUPABASE_PAT:?SUPABASE_PAT manquant dans .env}"
: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF manquant dans .env}"

echo "→ Push: $SQL_FILE  →  projet $SUPABASE_PROJECT_REF"

PAYLOAD=$(jq -Rs '{query: .}' < "$SQL_FILE")
HTTP_CODE=$(curl -sS -o /tmp/supabase-migration-response.json -w "%{http_code}" \
  -X POST "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  -H "Content-Type: application/json" \
  --data-raw "$PAYLOAD")

BODY=$(cat /tmp/supabase-migration-response.json)
rm -f /tmp/supabase-migration-response.json

if [[ "$HTTP_CODE" =~ ^2 ]]; then
  echo "✅ Succès (HTTP $HTTP_CODE)"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
  echo "❌ Échec (HTTP $HTTP_CODE)" >&2
  echo "$BODY" | jq . 2>/dev/null >&2 || echo "$BODY" >&2
  exit 1
fi
