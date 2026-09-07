#!/usr/bin/env bash
# Registra um conector do Debezium por database que publica evento.
#
# O EventRouter é o que transforma a linha da tabela outbox no evento final:
# a chave da mensagem vira o aggregateid (ordem por entidade, que é a única
# ordem que importa) e o tópico sai da coluna "topic", então o serviço decide
# o nome sem depender de configuração aqui.
set -euo pipefail

CONNECT_URL="${CONNECT_URL:-http://localhost:8083}"

registrar() {
  local servico="$1" database="$2" usuario="$3" senha="$4"

  echo "Registrando outbox-${servico}..."
  curl -sS -X PUT "${CONNECT_URL}/connectors/outbox-${servico}/config" \
    -H 'Content-Type: application/json' \
    -d "{
      \"connector.class\": \"io.debezium.connector.postgresql.PostgresConnector\",
      \"database.hostname\": \"postgres\",
      \"database.port\": \"5432\",
      \"database.user\": \"${usuario}\",
      \"database.password\": \"${senha}\",
      \"database.dbname\": \"${database}\",
      \"topic.prefix\": \"${servico}\",
      \"plugin.name\": \"pgoutput\",
      \"slot.name\": \"outbox_${servico}\",
      \"publication.name\": \"outbox_${servico}_pub\",
      \"table.include.list\": \"public.outbox\",
      \"tombstones.on.delete\": \"false\",
      \"transforms\": \"outbox\",
      \"transforms.outbox.type\": \"io.debezium.transforms.outbox.EventRouter\",
      \"transforms.outbox.table.field.event.id\": \"id\",
      \"transforms.outbox.table.field.event.key\": \"aggregateid\",
      \"transforms.outbox.table.field.event.payload\": \"payload\",
      \"transforms.outbox.route.by.field\": \"topic\",
      \"transforms.outbox.route.topic.replacement\": \"\\\${routedByValue}\",
      \"transforms.outbox.table.fields.additional.placement\": \"type:header:eventType\",
      \"key.converter\": \"org.apache.kafka.connect.storage.StringConverter\",
      \"value.converter\": \"org.apache.kafka.connect.storage.StringConverter\"
    }"
  echo
}

registrar catalog      catalog  catalog  catalog
registrar order        orders   orders   orders
registrar payment      payments payments payments
registrar notification notifications notifications notifications

echo "Conectores registrados. Estado:"
curl -sS "${CONNECT_URL}/connectors?expand=status" | head -c 2000
echo
