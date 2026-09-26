#!/usr/bin/env bash
# Registra um conector do Debezium por database que publica evento (catalog,
# order, payment). Roda no one-shot connect-init, depois do Flyway dos três
# serviços: a publication "filtered" exige que public.outbox já exista.
#
# O EventRouter transforma a linha da outbox no evento final: a chave vira o
# aggregateid (ordem por entidade) e o tópico sai da coluna "topic".
# snapshot.mode=when_needed: se a posição salva sumiu (slot recriado), o conector
# refaz o snapshot da outbox em vez de pular o que ficou para trás.
#
# DRY_RUN=1 só imprime os JSONs, um por linha.
set -euo pipefail

CONNECT_URL="${CONNECT_URL:-http://localhost:8083}"
CONECTORES="catalog:catalog order:orders payment:payments"   # serviço:database (usuário = database)

config() {
  # Senha de <DATABASE>_DB_PASSWORD (padrão = database), escapada para o JSON e depois para o sed.
  local var="${2^^}_DB_PASSWORD" senha
  senha=$(printf '%s' "${!var:-$2}" | sed -e 's/[\\"]/\\&/g' -e 's/[\\/&]/\\&/g')
  # Heredoc com aspas: nada é expandido pelo shell, então ${routedByValue} chega literal ao Debezium.
  sed -e "s/__SERVICO__/$1/g" -e "s/__DB__/$2/g" -e "s/__USUARIO__/$2/g" -e "s/__SENHA__/$senha/g" <<'EOF' | tr -d '\n'
{
  "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
  "database.hostname": "postgres",
  "database.port": "5432",
  "database.user": "__USUARIO__",
  "database.password": "__SENHA__",
  "database.dbname": "__DB__",
  "topic.prefix": "__SERVICO__",
  "plugin.name": "pgoutput",
  "slot.name": "outbox___SERVICO__",
  "publication.name": "outbox___SERVICO___pub",
  "publication.autocreate.mode": "filtered",
  "table.include.list": "public.outbox",
  "heartbeat.interval.ms": "10000",
  "snapshot.mode": "when_needed",
  "tombstones.on.delete": "false",
  "transforms": "outbox",
  "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
  "transforms.outbox.table.field.event.id": "id",
  "transforms.outbox.table.field.event.key": "aggregateid",
  "transforms.outbox.table.field.event.payload": "payload",
  "transforms.outbox.route.by.field": "topic",
  "transforms.outbox.route.topic.replacement": "${routedByValue}",
  "transforms.outbox.table.fields.additional.placement": "type:header:eventType",
  "key.converter": "org.apache.kafka.connect.storage.StringConverter",
  "value.converter": "org.apache.kafka.connect.storage.StringConverter"
}
EOF
  echo
}

if [ "${DRY_RUN:-}" = 1 ]; then
  for c in $CONECTORES; do config "${c%%:*}" "${c##*:}"; done
  exit 0
fi

falhar() {
  echo "ERRO: $1" >&2
  curl -sS "$CONNECT_URL/connectors?expand=status" >&2 || true
  echo >&2
  exit 1
}

echo "Aguardando o Kafka Connect em $CONNECT_URL..."
for i in $(seq 120); do
  curl -fsS -o /dev/null "$CONNECT_URL/connectors" 2>/dev/null && break
  [ "$i" -lt 120 ] || falhar "Kafka Connect não respondeu em 240 s"
  sleep 2
done

for c in $CONECTORES; do
  servico="${c%%:*}"
  echo "Registrando outbox-$servico..."
  config "$servico" "${c##*:}" |
    curl -fsS -o /dev/null -X PUT "$CONNECT_URL/connectors/outbox-$servico/config" \
      -H 'Content-Type: application/json' --data-binary @- ||
    falhar "PUT outbox-$servico recusado"
done

for c in $CONECTORES; do
  servico="${c%%:*}"
  for i in $(seq 30); do
    status=$(curl -fsS "$CONNECT_URL/connectors/outbox-$servico/status" 2>/dev/null || true)
    # conector + task 0 em RUNNING (a imagem não tem jq)
    [ "$(grep -o '"state":"RUNNING"' <<<"$status" | wc -l)" -eq 2 ] && break
    grep -q '"state":"FAILED"' <<<"$status" && falhar "outbox-$servico falhou: $status"
    [ "$i" -lt 30 ] || falhar "outbox-$servico não chegou a RUNNING em 60 s: $status"
    sleep 2
  done
  echo "outbox-$servico RUNNING"
done
