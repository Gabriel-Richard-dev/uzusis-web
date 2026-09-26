#!/usr/bin/env bash
# E2E da compra pela API: realm, segurança, produto com foto, sacola, pedido,
# saga com Stripe falso (stripe-mock + webhook assinado aqui), e-mails, envio e
# recebimento, recusa com estorno e, no fim, pedidos para as telas do admin.
#
#   env WEB_PORT=8088 PUBLIC_URL=http://localhost:8088 \
#     docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --build
#   env BASE_URL=http://localhost:8088 bash scripts/e2e-compra.sh     # termina com "E2E OK"
#
# Precisa de bash, curl, jq, openssl e docker no host.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE_URL="${BASE_URL:-${PUBLIC_URL:-http://localhost:8080}}"
MAILPIT_URL="${MAILPIT_URL:-http://localhost:${MAILPIT_PORT:-8025}}"
E2E_WEBHOOK_SECRET="${E2E_WEBHOOK_SECRET:-whsec_e2e_uzusis_local}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"

for c in curl jq openssl docker; do
  command -v "$c" >/dev/null || { echo "falta o comando $c" >&2; exit 1; }
done

API="$BASE_URL/api"
TS=$(date +%s)
TMP=$(mktemp -d)
CORPO="$TMP/corpo"
STATUS="" TIPO="" PASSO="início"
PRODUTO="" PRODUTO_EXCLUIDO="" TOKEN_ADMIN="" TOKEN_CLIENTE=""
JSON=(-H 'Content-Type: application/json')
ENDERECO='{"endereco":{"destinatario":"Cliente E2E","telefone":"85999990000","cep":"60000-000","rua":"Rua A","numero":"10","complemento":"Apto 101","bairro":"Centro","cidade":"Fortaleza","uf":"CE"}}'

# ---------------------------------------------------------------- utilitários
ok() { echo "✔ $1"; }

falha() {
  echo "✘ $PASSO: $1" >&2
  echo "  HTTP $STATUS" >&2
  echo "  resposta: $(head -c 2000 "$CORPO" 2>/dev/null)" >&2
  exit 1
}

# req <método> <url> [args do curl]: corpo em $CORPO, status em $STATUS, content-type em $TIPO
req() {
  local metodo="$1" url="$2" saida
  shift 2
  : > "$CORPO"
  saida=$(curl -sS -o "$CORPO" -w '%{http_code} %{content_type}' -X "$metodo" "$@" "$url" 2>"$TMP/erro") ||
    saida="000 $(head -c 300 "$TMP/erro")"
  STATUS="${saida%% *}" TIPO="${saida#* }"
}

status() { [ "$STATUS" = "$1" ] || falha "esperado HTTP $1"; }
espera() { local s="$1"; shift; req "$@"; status "$s"; }                          # espera <status> <método> <url> [args]
confere() { jq -e "$@" "$CORPO" >/dev/null 2>&1 || falha "não confere: ${*: -1}"; }  # confere [args do jq] <filtro>

# responde <status> <filtro jq> <método> <url> [args]: sucesso se o status e o filtro batem
responde() {
  local s="$1" filtro="$2"
  shift 2
  req "$@"
  [ "$STATUS" = "$s" ] && jq -e "$filtro" "$CORPO" >/dev/null 2>&1
}

# ate <segundos> <o quê> <comando...>: repete a cada 1 s até o comando dar certo
ate() {
  local fim=$(($(date +%s) + $1)) oque="$2"
  shift 2
  until "$@"; do
    [ "$(date +%s)" -lt "$fim" ] || falha "tempo esgotado esperando $oque"
    sleep 1
  done
}

token() { # token <realm> <usuário> <senha> → access token em $CORPO
  espera 200 POST "$BASE_URL/auth/realms/$1/protocol/openid-connect/token" \
    -d grant_type=password -d client_id=admin-cli \
    --data-urlencode "username=$2" --data-urlencode "password=$3"
}

claims() { # payload do JWT → $CORPO
  local p
  p=$(cut -d. -f2 <<<"$1" | tr '_-' '/+')
  while [ $((${#p} % 4)) -ne 0 ]; do p="$p="; done
  base64 -d <<<"$p" >"$CORPO"
}

assina() { # assina <t> <payload> → v1 do Stripe-Signature
  printf '%s.%s' "$1" "$2" | openssl dgst -sha256 -hmac "$E2E_WEBHOOK_SECRET" -hex | awk '{print $NF}'
}

N=0
webhook() { # webhook <tipo> <pi> <valor em centavos>
  local t extra="" payload
  N=$((N + 1))
  t=$(date +%s)
  if [ "$1" = payment_intent.payment_failed ]; then
    extra=',"last_payment_error":{"message":"Your card was declined."}'
  fi
  payload='{"id":"evt_e2e_'"$TS"'_'"$N"'","object":"event","type":"'"$1"'","created":'"$t"',"livemode":false,"data":{"object":{"id":"'"$2"'","object":"payment_intent","latest_charge":"ch_e2e_'"$TS"'","amount":'"$3"',"currency":"brl"'"$extra"'}}}'
  req POST "$API/webhooks/stripe" "${JSON[@]}" -H "Stripe-Signature: t=$t,v1=$(assina "$t" "$payload")" --data-binary "$payload"
}

email() { # email <id do pedido> <palavra do assunto>
  responde 200 "any(.messages[]; .Subject | contains(\"#$1 \") and contains(\"$2\"))" GET "$MAILPIT_URL/api/v1/messages?limit=100"
}

estoque_m() { # estoque_m <quantidade>
  responde 200 "any(.tamanhos[]; .sigla == \"M\" and .quantidade == $1)" GET "$API/produtos/$PRODUTO"
}

estornado() { # estornado <id do pedido>: status do pagamento direto no banco
  docker compose exec -T postgres psql -U payments -d payments -tAc \
    "select status from pagamento where order_id=$1" >"$CORPO" 2>&1
  [ "$(cat "$CORPO")" = ESTORNADO ]
}

esvaziar_sacola() {
  local item
  espera 200 GET "$API/carrinho" "${COMO_CLIENTE[@]}"
  for item in $(jq -r '.itens[].id' "$CORPO"); do
    espera 204 DELETE "$API/carrinho/itens/$item" "${COMO_CLIENTE[@]}"
  done
}

# Passos 4 a 8: sacola com <qtd> de M, pedido em CE, saga até PAGO. Deixa PEDIDO e PI.
comprar() { # comprar <qtd> <estoque de M esperado depois da reserva>
  local qtd="$1" estoque="$2" sub=$((5990 * $1)) total=$((5990 * $1 + 1000))

  PASSO="sacola com $qtd × M"
  esvaziar_sacola
  espera 201 POST "$API/carrinho/itens" "${COMO_CLIENTE[@]}" "${JSON[@]}" \
    -d "{\"produtoId\":$PRODUTO,\"sigla\":\"M\",\"quantidade\":$qtd}"
  espera 200 GET "$API/pedidos/frete?uf=CE" "${COMO_CLIENTE[@]}"
  confere '.uf == "CE" and .valor == 10'
  ok "$PASSO; frete CE = 10,00"

  PASSO="pedido"
  espera 201 POST "$API/pedidos" "${COMO_CLIENTE[@]}" "${JSON[@]}" -d "$ENDERECO"
  confere --argjson s "$sub" --argjson t "$total" \
    '.status == "CRIADO" and (.subtotal * 100 | round) == $s and .frete == 10 and (.valorTotal * 100 | round) == $t'
  PEDIDO=$(jq -r .id "$CORPO")
  espera 200 GET "$API/carrinho" "${COMO_CLIENTE[@]}"
  confere '.itens | length == 0'
  ok "pedido #$PEDIDO em CRIADO com total $total centavos (frete incluso); sacola vazia"

  PASSO="saga do pedido #$PEDIDO"
  ate 60 "o client-secret" responde 200 '.paymentIntentId | startswith("pi_")' \
    GET "$API/pagamentos/$PEDIDO/client-secret" "${COMO_CLIENTE[@]}"
  PI=$(jq -r .paymentIntentId "$CORPO")
  ate 60 "estoque de M = $estoque" estoque_m "$estoque"
  ok "intent $PI criado e estoque de M reservado (restam $estoque)"

  PASSO="webhook de sucesso do pedido #$PEDIDO"
  webhook payment_intent.succeeded "$PI" "$total"
  status 200
  ok "$PASSO"

  PASSO="pedido #$PEDIDO pago"
  ate 60 "PAGO" responde 200 '.status == "PAGO" and .pagoEm != null' GET "$API/pedidos/$PEDIDO" "${COMO_CLIENTE[@]}"
  espera 200 GET "$API/pedidos/admin?status=PAGO&sort=pagoEm,desc&size=100" "${COMO_ADMIN[@]}"
  confere --argjson id "$PEDIDO" \
    'any(.content[]; .id == $id and .endereco.numero == "10" and .cliente.email == "cliente@uzusis.local")'
  ok "$PASSO e listado para o admin com endereço e cliente"
}

limpar() {
  if [ -n "$PRODUTO" ] && [ -z "$PRODUTO_EXCLUIDO" ]; then
    local item
    curl -sS -o /dev/null -X DELETE -H "Authorization: Bearer $TOKEN_ADMIN" "$API/produtos/$PRODUTO" || true
    for item in $(curl -sS -H "Authorization: Bearer $TOKEN_CLIENTE" "$API/carrinho" 2>/dev/null | jq -r '.itens[]?.id' 2>/dev/null); do
      curl -sS -o /dev/null -X DELETE -H "Authorization: Bearer $TOKEN_CLIENTE" "$API/carrinho/itens/$item" || true
    done
    echo "(limpeza: produto #$PRODUTO desativado e sacola do cliente esvaziada)" >&2
  fi
  rm -rf "$TMP"
}
trap limpar EXIT

# ------------------------------------------------------------- 0. pronto
PASSO="stack pronto"
pronto() {
  responde 200 '.content != null' GET "$API/produtos" &&
    responde 200 '.habilitado == true' GET "$API/pagamentos/config"
}
ate 300 "GET /api/produtos e pagamentos habilitados (override e2e ativo?)" pronto
ok "API no ar e pagamentos habilitados"

PASSO="configuração do realm"
token master "$KEYCLOAK_ADMIN" "$KEYCLOAK_ADMIN_PASSWORD"
KC=(-H "Authorization: Bearer $(jq -r .access_token "$CORPO")")
espera 200 GET "$BASE_URL/auth/admin/realms/uzusis/roles/default-roles-uzusis/composites/realm" "${KC[@]}"
confere 'any(.[]; .name == "CUSTOMER")'
espera 200 GET "$BASE_URL/auth/admin/realms/uzusis" "${KC[@]}"
confere '.verifyEmail == true and .registrationAllowed == true and .resetPasswordAllowed == true
  and .defaultLocale == "pt-BR" and .loginTheme == "uzusis" and .emailTheme == "uzusis"
  and (.passwordPolicy // "") != "" and .smtpServer.host == "mailpit"'
ok "realm com CUSTOMER padrão, verificação de e-mail, pt-BR, temas e SMTP no Mailpit"

# ------------------------------------------------------------- 1. tokens
PASSO="tokens"
token uzusis admin@uzusis.local admin123
TOKEN_ADMIN=$(jq -r .access_token "$CORPO")
token uzusis cliente@uzusis.local cliente123
TOKEN_CLIENTE=$(jq -r .access_token "$CORPO")
COMO_ADMIN=(-H "Authorization: Bearer $TOKEN_ADMIN")
COMO_CLIENTE=(-H "Authorization: Bearer $TOKEN_CLIENTE")
claims "$TOKEN_CLIENTE"
confere --arg iss "$BASE_URL/auth/realms/uzusis" \
  '.iss == $iss and (.email // "") != "" and any(.realm_access.roles[]; . == "CUSTOMER")'
claims "$TOKEN_ADMIN"
confere --arg iss "$BASE_URL/auth/realms/uzusis" '.iss == $iss and any(.realm_access.roles[]; . == "ADMIN")'
ok "tokens com iss $BASE_URL/auth/realms/uzusis, e-mail e papéis"

# ------------------------------------------------------------- 2. segurança
PASSO="segurança"
PRODUTO_JSON='{"nome":"E2E Blusa '"$TS"'","preco":59.90,"descricao":"Produto criado pelo e2e.","categoria":"BLUSA","tamanhos":[{"sigla":"M","quantidade":10},{"sigla":"P","quantidade":2}]}'
espera 401 GET "$API/pedidos"
espera 401 POST "$API/produtos" "${JSON[@]}" -d "$PRODUTO_JSON"
espera 401 GET "$API/produtos/admin"
req POST "$API/produtos" "${COMO_CLIENTE[@]}" "${JSON[@]}" -d "$PRODUTO_JSON"
if [ "$STATUS" = 201 ]; then PRODUTO=$(jq -r .id "$CORPO"); fi   # criado indevidamente: a limpeza desativa
status 403
espera 403 GET "$API/pedidos/admin" "${COMO_CLIENTE[@]}"
espera 404 GET "$API/pedidos/999999999" "${COMO_CLIENTE[@]}"
t=$(date +%s)
espera 400 POST "$API/webhooks/stripe" "${JSON[@]}" -H "Stripe-Signature: t=$t,v1=$(assina "$t" outro-corpo)" \
  --data-binary '{"id":"evt_e2e_forjado","object":"event","type":"payment_intent.succeeded","data":{"object":{"id":"pi_x"}}}'
espera 400 POST "$API/webhooks/stripe" "${JSON[@]}" -H "Stripe-Signature: t=$t,v1=$(assina "$t" nao-json)" \
  --data-binary nao-json
ok "401 anônimo, 403 cliente em rota de admin, 404 em pedido alheio, webhook forjado e não-JSON dão 400"

# ------------------------------------------------------------- 3. produto
PASSO="produto (admin)"
espera 201 POST "$API/produtos" "${COMO_ADMIN[@]}" "${JSON[@]}" -d "$PRODUTO_JSON"
PRODUTO=$(jq -r .id "$CORPO")
base64 -d >"$TMP/pixel.png" <<<'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
espera 201 POST "$API/produtos/$PRODUTO/fotos" "${COMO_ADMIN[@]}" -F "arquivo=@$TMP/pixel.png;type=image/png"
FOTO=$(jq -r .url "$CORPO")
[[ "$FOTO" == /storage/produtos/"$PRODUTO"/*.png ]] || falha "url da foto inesperada: $FOTO"
espera 200 GET "$BASE_URL$FOTO"
[ "$TIPO" = image/png ] || falha "Content-Type da foto: $TIPO"
espera 404 GET "$BASE_URL/storage/produtos/"
printf 'isto não é uma imagem' >"$TMP/x.png"
espera 415 POST "$API/produtos/$PRODUTO/fotos" "${COMO_ADMIN[@]}" -F "arquivo=@$TMP/x.png;type=image/png"
head -c 7340032 /dev/zero >"$TMP/grande.png"
espera 413 POST "$API/produtos/$PRODUTO/fotos" "${COMO_ADMIN[@]}" -F "arquivo=@$TMP/grande.png;type=image/png"
confere '.detail == "Arquivo maior que 5 MB."'
ok "produto #$PRODUTO com foto servida em $FOTO; listagem 404, texto 415, 7 MB 413"

# ------------------------------------------------------------- 4 a 8. compra paga
comprar 2 8

# ------------------------------------------------------------- 9. e-mail
PASSO="e-mail de confirmação"
ate 60 "e-mail 'Pedido #$PEDIDO confirmado'" email "$PEDIDO" confirmado
ok "$PASSO do pedido #$PEDIDO"

# ------------------------------------------------------------- 10. envio e recebimento
PASSO="envio e recebimento"
espera 200 POST "$API/pedidos/$PEDIDO/enviar" "${COMO_ADMIN[@]}"
confere '.status == "ENVIADO" and .enviadoEm != null'
ate 60 "e-mail 'Pedido #$PEDIDO enviado'" email "$PEDIDO" enviado
espera 200 POST "$API/pedidos/$PEDIDO/receber" "${COMO_CLIENTE[@]}"
confere '.status == "RECEBIDO" and .recebidoEm != null'
ok "pedido #$PEDIDO ENVIADO (com e-mail) e RECEBIDO"

# ------------------------------------------------------------- 11. caminho de falha
PASSO="pedido recusado"
espera 201 POST "$API/carrinho/itens" "${COMO_CLIENTE[@]}" "${JSON[@]}" -d "{\"produtoId\":$PRODUTO,\"sigla\":\"M\",\"quantidade\":1}"
espera 201 POST "$API/pedidos" "${COMO_CLIENTE[@]}" "${JSON[@]}" -d "$ENDERECO"
PEDIDO2=$(jq -r .id "$CORPO")
ate 60 "o client-secret do pedido #$PEDIDO2" responde 200 '.paymentIntentId | startswith("pi_")' \
  GET "$API/pagamentos/$PEDIDO2/client-secret" "${COMO_CLIENTE[@]}"
PI2=$(jq -r .paymentIntentId "$CORPO")
ate 60 "estoque de M = 7" estoque_m 7
espera 201 POST "$API/carrinho/itens" "${COMO_CLIENTE[@]}" "${JSON[@]}" -d "{\"produtoId\":$PRODUTO,\"sigla\":\"M\",\"quantidade\":1}"
espera 409 POST "$API/pedidos" "${COMO_CLIENTE[@]}" "${JSON[@]}" -d "$ENDERECO"
confere '.detail == "Você já tem um pedido aguardando pagamento."'
espera 200 GET "$API/carrinho" "${COMO_CLIENTE[@]}"
confere '.itens | length == 1'
esvaziar_sacola
ok "segundo pedido com o #$PEDIDO2 aguardando pagamento: 409 e sacola intacta"
webhook payment_intent.payment_failed "$PI2" 6990
status 200
ate 60 "o pedido #$PEDIDO2 CANCELADO" responde 200 \
  '.status == "CANCELADO" and .motivoCancelamento == "Pagamento recusado" and .sacolaRestaurada == true' \
  GET "$API/pedidos/$PEDIDO2" "${COMO_CLIENTE[@]}"
ate 60 "estoque de M de volta a 8" estoque_m 8
ate 60 "e-mail 'Pedido #$PEDIDO2 cancelado'" email "$PEDIDO2" cancelado
espera 200 GET "$API/carrinho" "${COMO_CLIENTE[@]}"
confere --argjson p "$PRODUTO" 'any(.itens[]; .produtoId == $p and .sigla == "M" and .quantidade == 1)'
ok "pedido #$PEDIDO2 recusado: CANCELADO sem vazar o texto da Stripe, estoque devolvido, e-mail e sacola restaurada"

PASSO="nunca cobrar pedido cancelado"
espera 409 GET "$API/pagamentos/$PEDIDO2/client-secret" "${COMO_CLIENTE[@]}"
confere '.detail == "Pagamento indisponível: pedido cancelado"'
webhook payment_intent.succeeded "$PI2" 6990
status 200
for _ in $(seq 10); do
  espera 200 GET "$API/pedidos/$PEDIDO2" "${COMO_CLIENTE[@]}"
  confere '.status == "CANCELADO"'
  sleep 1
done
ate 30 "o pagamento do pedido #$PEDIDO2 ESTORNADO" estornado "$PEDIDO2"
ok "client-secret 409; pagamento tardio do pedido #$PEDIDO2 estornado e o pedido segue CANCELADO"

# ------------------------------------------------------------- 12. dados para as telas
comprar 1 7
comprar 1 6
comprar 1 5
PASSO="dados para as telas"
espera 200 POST "$API/pedidos/$PEDIDO/enviar" "${COMO_ADMIN[@]}"
confere '.status == "ENVIADO"'
ok "dois pedidos PAGO e o #$PEDIDO ENVIADO para o revisor de UI; estoque de M = 5"

# ------------------------------------------------------------- 13. limpeza
PASSO="limpeza"
espera 204 DELETE "$API/produtos/$PRODUTO" "${COMO_ADMIN[@]}"
PRODUTO_EXCLUIDO=1
espera 404 GET "$API/produtos/$PRODUTO"
espera 200 GET "$API/produtos/admin?nome=E2E&size=100" "${COMO_ADMIN[@]}"
confere --argjson id "$PRODUTO" 'any(.content[]; .id == $id and .ativo == false)'
espera 200 GET "$API/carrinho" "${COMO_CLIENTE[@]}"
confere '.itens | length == 0'
ok "produto #$PRODUTO desativado (404 na vitrine, inativo no admin) e sacola vazia"

echo "E2E OK"
