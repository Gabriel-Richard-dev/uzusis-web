#!/usr/bin/env bash
# Checa o caminho de autenticação ponta a ponta: login devolve JWT, o JWT abre
# LEGADO: só serve à API .NET (docker compose --profile legacy up -d), acessada
# direto na porta API_PORT, sem o nginx (que agora aponta para o gateway Java).
# uma rota protegida e a falta dele fecha. Pega de volta o IDX12401 (Expires ==
# NotBefore) que derrubava todo login com 500.
set -euo pipefail

BASE="${BASE:-http://localhost:${API_PORT:-5141}}"
do_env() { [ -f .env ] || return 0; sed -n "s/^$1=//p" .env | tail -n1 | sed 's/^"\(.*\)"$/\1/'; }
EMAIL="${ADMIN_EMAIL:-$(do_env ADMIN_EMAIL)}"
SENHA="${ADMIN_PASSWORD:-$(do_env ADMIN_PASSWORD)}"
: "${EMAIL:?defina ADMIN_EMAIL no .env}" "${SENHA:?defina ADMIN_PASSWORD no .env}"

codigo() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
ok() { echo "  ok  $1"; }
falha() { echo "  FALHOU  $1"; exit 1; }

TOKEN=$(curl -fsS -X POST "$BASE/administradorauth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"senha\":\"$SENHA\"}" |
  python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])') || falha "login do admin"
ok "login do admin devolve token"

[ "$(codigo -H "Authorization: Bearer $TOKEN" "$BASE/produto/admin/dashboard")" = 200 ] \
  || falha "token válido deveria abrir /produto/admin/dashboard"
ok "token válido abre rota protegida"

[ "$(codigo "$BASE/produto/admin/dashboard")" = 401 ] \
  || falha "rota protegida deveria recusar sem token"
ok "sem token a rota protegida devolve 401"

[ "$(codigo "$BASE/produto/0")" = 200 ] || falha "listagem pública de produtos"
ok "listagem pública segue aberta"

echo "auth ok."
