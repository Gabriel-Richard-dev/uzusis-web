#!/usr/bin/env bash
# Confere o JSON do registrar: senha do ambiente (com aspas, barras e &) e snapshot.mode.
#   bash uzusis-java/infra/debezium/testar-registrar.sh   → "registrar OK"
set -euo pipefail
senha='a"b\c/d&e$f'
env DRY_RUN=1 ORDERS_DB_PASSWORD="$senha" bash "$(dirname "$0")/registrar-conectores.sh" |
  python3 -c '
import json, sys
cs = [json.loads(l) for l in sys.stdin if l.strip()]
senhas = {c["database.dbname"]: c["database.password"] for c in cs}
assert senhas == {"catalog": "catalog", "orders": sys.argv[1], "payments": "payments"}, senhas
assert all(c["snapshot.mode"] == "when_needed" for c in cs)
print("registrar OK")' "$senha"
