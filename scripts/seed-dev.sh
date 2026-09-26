#!/usr/bin/env bash
# Popula a vitrine com produtos de exemplo pela API do catálogo (stack Java),
# com estoque PP–GG e fotos geradas. Pula os produtos que já existem pelo nome.
#
#   env BASE_URL=http://localhost:8088 bash scripts/seed-dev.sh
set -euo pipefail

BASE_URL="${BASE_URL:-${PUBLIC_URL:-http://localhost:8080}}"
ADMIN_USER="${ADMIN_USER:-admin@uzusis.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
API="$BASE_URL/api"

TOKEN=$(curl -sS --fail-with-body "$BASE_URL/auth/realms/uzusis/protocol/openid-connect/token" \
  -d grant_type=password -d client_id=admin-cli \
  --data-urlencode "username=$ADMIN_USER" --data-urlencode "password=$ADMIN_PASSWORD" | jq -r .access_token)
AUTH="Authorization: Bearer $TOKEN"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# PNG 600×800 em degradê com as cores da marca (só stdlib: zlib + struct).
python3 - "$TMP" <<'PY'
import struct, sys, zlib

def png(caminho, topo, base, largura=600, altura=800):
    def bloco(tipo, dados):
        return struct.pack('>I', len(dados)) + tipo + dados + struct.pack('>I', zlib.crc32(tipo + dados))
    linhas = bytearray()
    for y in range(altura):
        t = y / (altura - 1)
        cor = bytes(round(a + (b - a) * t) for a, b in zip(topo, base))
        linhas += b'\x00' + cor * largura
    with open(caminho, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(bloco(b'IHDR', struct.pack('>IIBBBBB', largura, altura, 8, 2, 0, 0, 0)))
        f.write(bloco(b'IDAT', zlib.compress(bytes(linhas), 9)))
        f.write(bloco(b'IEND', b''))

paleta = [((0xef, 0xe9, 0xe3), (0xa3, 0x76, 0x5f)), ((0xf3, 0xec, 0xe5), (0x7a, 0x5a, 0x41)),
          ((0xe6, 0xe0, 0xda), (0x6b, 0x64, 0x5e)), ((0xfa, 0xf8, 0xf5), (0xa3, 0x76, 0x5f)),
          ((0xa3, 0x76, 0x5f), (0x65, 0x4a, 0x35)), ((0xef, 0xe9, 0xe3), (0x29, 0x2b, 0x2e))]
for i, (topo, base) in enumerate(paleta):
    png(f'{sys.argv[1]}/f{i}.png', topo, base)
PY

# produto <nome> <preço> <categoria> <descrição> "<PP P M G GG>" "<fotos>"
produto() {
  local nome="$1" preco="$2" categoria="$3" descricao="$4" estoque="$5" fotos="$6" corpo id f
  if curl -sS --fail-with-body -G -H "$AUTH" "$API/produtos/admin" \
       --data-urlencode "nome=$nome" --data-urlencode size=100 |
     jq -e --arg n "$nome" 'any(.content[]; .nome == $n)' >/dev/null; then
    echo "  = $nome (já existe)"
    return
  fi
  corpo=$(jq -nc --arg nome "$nome" --argjson preco "$preco" --arg cat "$categoria" --arg desc "$descricao" --arg est "$estoque" \
    '{nome: $nome, preco: $preco, categoria: $cat, descricao: $desc,
      tamanhos: ([["PP","P","M","G","GG"], ($est | split(" ") | map(tonumber))] | transpose
                 | map({sigla: .[0], quantidade: .[1]}))}')
  id=$(curl -sS --fail-with-body -H "$AUTH" -H 'Content-Type: application/json' -d "$corpo" "$API/produtos" | jq -r .id)
  for f in $fotos; do
    curl -sS --fail-with-body -o /dev/null -H "$AUTH" -F "arquivo=@$TMP/$f.png;type=image/png" "$API/produtos/$id/fotos"
  done
  echo "  + $nome"
}

echo "Populando $API ..."
produto "Blusa Linho Areia"        89.90  BLUSA      "Blusa de linho com botões frontais e caimento leve."      "2 4 5 3 1" "f0 f3"
produto "Blusa Canelada Off-White" 69.90  BLUSA      "Blusa de malha canelada, gola redonda."                   "0 3 6 4 2" "f3"
produto "Calça Wide Leg Caramelo"  199.90 CALCA      "Calça de alfaiataria com cintura alta e pernas amplas."   "1 3 4 3 1" "f1 f4"
produto "Calça Pantalona Preta"    179.90 CALCA      "Pantalona fluida com elástico nas costas."                "0 2 3 2 0" "f5"
produto "Short Alfaiataria Bege"   119.90 SHORT      "Short de alfaiataria com pregas."                         "1 2 3 2 1" "f0"
produto "Saia Midi Plissada"       149.90 SAIA       "Saia midi plissada com cós de elástico."                  "0 3 3 2 1" "f2 f3"
produto "Cropped Tricô Terracota"  79.90  CROPPED    "Cropped de tricô leve, manga curta."                      "2 3 3 1 0" "f4"
produto "Conjunto Linho Natural"   289.90 CONJUNTOS  "Conjunto de camisa e calça em linho."                     "1 2 2 2 1" "f0 f1"
produto "Blusão Moletom Areia"     159.90 BLUSAO     "Blusão de moletom felpado, modelagem ampla."              "0 2 4 3 2" "f3"
produto "Body Gola Alta Preto"     99.90  BODY       "Body de malha com gola alta e fechamento de colchetes."   "1 2 3 1 0" "f5 f2"
produto "Body Alcinha Off-White"   89.90  BODY       "Body de alcinha com decote reto."                         "2 2 2 1 1" "f3"
produto "Bolsa Palha Natural"      129.90 ACESSORIOS "Bolsa de palha com alça de couro."                        "0 0 5 0 0" "f0"
echo "pronto."
