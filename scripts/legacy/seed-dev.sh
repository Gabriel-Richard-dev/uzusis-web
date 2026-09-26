#!/usr/bin/env bash
# Popula a loja com produtos de exemplo para desenvolvimento.
# LEGADO: só serve à API .NET (docker compose --profile legacy up -d), acessada
# direto na porta API_PORT, sem o nginx (que agora aponta para o gateway Java).
# O admin não entra aqui: a API o cria sozinha no boot a partir de
# ADMIN_EMAIL/ADMIN_PASSWORD do .env.
set -euo pipefail

# Lê só as duas chaves necessárias do .env — as mesmas que a API usa para criar
# o admin no boot. Sem `source`: o arquivo é lido pelo compose, não pelo shell,
# e pode conter valores que o bash não aceitaria.
do_env() {
  [ -f .env ] || return 0
  sed -n "s/^$1=//p" .env | tail -n1 | sed 's/^"\(.*\)"$/\1/'
}

BASE="${BASE:-http://localhost:${API_PORT:-5141}}"
EMAIL="${ADMIN_EMAIL:-$(do_env ADMIN_EMAIL)}"
SENHA="${ADMIN_PASSWORD:-$(do_env ADMIN_PASSWORD)}"

: "${EMAIL:?defina ADMIN_EMAIL no .env}"
: "${SENHA:?defina ADMIN_PASSWORD no .env}"

TOKEN=$(curl -fsS -X POST "$BASE/administradorauth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"senha\":\"$SENHA\"}" |
  python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

python3 - "$TMP" <<'PY'
import struct, sys, zlib
destino = sys.argv[1]

def png(caminho, cor):
    def bloco(tipo, dados):
        corpo = tipo + dados
        return struct.pack('>I', len(dados)) + corpo + struct.pack('>I', zlib.crc32(corpo))
    linhas = b''.join(b'\x00' + bytes(cor) * 64 for _ in range(64))
    with open(caminho, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(bloco(b'IHDR', struct.pack('>IIBBBBB', 64, 64, 8, 2, 0, 0, 0)))
        f.write(bloco(b'IDAT', zlib.compress(linhas)))
        f.write(bloco(b'IEND', b''))

for i, cor in enumerate([(196, 160, 140), (150, 120, 105), (220, 205, 195)]):
    png(f'{destino}/f{i}.png', cor)
PY

adicionar() {
  curl -fsS -X POST "$BASE/produto/adicionar" -H "Authorization: Bearer $TOKEN" \
    -F "Nome=$1" -F "Preco=$2" -F "Categoria=$3" -F "Descricao=$4" \
    -F "QuantidadeP=3" -F "QuantidadeM=4" -F "QuantidadeG=2" \
    -F "FotoFiles=@$TMP/f0.png" -F "FotoFiles=@$TMP/f1.png" -F "FotoFiles=@$TMP/f2.png" \
    -o /dev/null
  echo "  + $1"
}

# Categoria: índice de ECategoriaProduto (0 Calca, 2 Saia, 3 Cropped, 4 Conjuntos, 6 Body, 7 Blusa)
adicionar "Blusa Canelada"  89.90  7 "Blusa de malha canelada"
adicionar "Calca Wide Leg"  199.90 0 "Calca de alfaiataria"
adicionar "Saia Midi"       149.90 2 "Saia midi plissada"
adicionar "Cropped Basico"  69.90  3 "Cropped de algodao"
adicionar "Body Gola Alta"  119.90 6 "Body de gola alta"
adicionar "Conjunto Linho"  289.90 4 "Conjunto de linho"

echo "pronto."
