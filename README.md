# Uzusis

Loja de roupas femininas em microserviços Java (Spring Boot, Kafka, Postgres,
Keycloak, Stripe, MinIO) e front Angular 22 (Tailwind 4 + spartan/ui) atrás de
nginx, tudo em Docker Compose. Backend em [`uzusis-api/README.md`](uzusis-api/README.md);
especificação completa no [`SPEC.md`](SPEC.md).

> **Nunca rode `docker compose down -v`** — o `-v` apaga os volumes (fotos, pedidos,
> usuários do Keycloak). Para parar: `docker compose stop` ou `down` (sem `-v`).

## Subir

```bash
docker compose up -d --build
```

Sobe sem `.env` (tudo tem padrão; veja o [`.env.example`](.env.example)). A primeira vez
leva alguns minutos (build Maven + Angular + import do realm). Ao fim, `docker compose ps -a`
mostra tudo `healthy`/`running` e os one-shots `minio-init`/`connect-init` em `Exited (0)`.

- **Pouca RAM** (<~4 GB): `docker compose build web && docker compose up -d --build`
  (evita `ng build` junto com o Maven).
- **Porta 8080 ocupada:** `env WEB_PORT=8088 PUBLIC_URL=http://localhost:8088 docker compose up -d --build`
  (ponha as duas no `.env` pra não esquecer; se o Keycloak já subiu em outra porta, veja
  [Reimportar o realm](#reimportar-o-realm)).

## Endereços e portas

Só duas portas vão ao host, em `127.0.0.1` (`WEB_BIND=0.0.0.0` abre pra rede); o resto
fica na rede interna do compose.

| O quê | Endereço |
|---|---|
| Loja e painel admin | http://localhost:8080 (`WEB_PORT`) |
| Console do Keycloak | http://localhost:8080/auth/admin (`admin`/`admin`) |
| E-mails de dev (Mailpit) | http://127.0.0.1:8025 (`MAILPIT_PORT`) |
| Traces (Jaeger, perfil `observability`) | http://127.0.0.1:16686 |

O nginx do `web` é a origem única: `/` SPA, `/api` gateway, `/auth` Keycloak, `/storage`
fotos no MinIO (só GET). `/actuator` não é exposto.

Usuários de teste (só dev): `admin@uzusis.local`/`admin123` (ADMIN) e
`cliente@uzusis.local`/`cliente123` (CUSTOMER). Cadastro, verificação de e-mail e reset
de senha são do Keycloak; os e-mails caem no Mailpit.

### Fora de dev

As senhas acima são públicas (ok em dev, só esta máquina alcança). Antes de expor:

1. **Senhas fortes no `.env` antes do 1º `up`:** `POSTGRES_PASSWORD`, `KEYCLOAK_ADMIN_PASSWORD`,
   `MINIO_ROOT_PASSWORD` e as de banco (`CATALOG`/`ORDERS`/`PAYMENTS`/`NOTIFICATIONS`/`IDENTITY_DB_PASSWORD`).
   Postgres e Keycloak só gravam a senha na criação — mudar depois não troca (veja abaixo).
2. **Stack já no ar:** troque na origem e depois no `.env`, e `docker compose up -d`:
   - Postgres: `docker compose exec postgres psql -U postgres -c "ALTER USER postgres PASSWORD 'nova'"`
     (idem `catalog`, `orders`, `payments`, `notifications`, `identity`);
   - admin Keycloak: console → realm `master` → Users → `admin` → Reset password (sem "Temporary");
   - MinIO: só o `.env`.
3. **Usuários de teste:** crie seu admin no console (realm `uzusis`, "Email verified" + role
   `ADMIN`), entre com ele e apague `admin@`/`cliente@uzusis.local` — ou remova o bloco `users`
   de `uzusis-api/infra/keycloak/import/uzusis-realm.json` antes do 1º `up` (o e2e/seed usam eles).
4. **Password grant:** realm `uzusis` → Clients → `admin-cli` → desligue "Direct access grants".
5. **SMTP real:** `SMTP_*`, `EMAIL_FROM`, `SMTP_FROM` no `.env` (notification-service lê a cada
   `up`; Keycloak só no import — stack no ar: Realm settings → Email, ou [reimporte](#reimportar-o-realm)).
6. **TLS:** proxy de borda na frente do `web`, `PUBLIC_URL=https://…` ([reimporte](#reimportar-o-realm)
   se mudou) e `WEB_BIND=0.0.0.0` se o proxy for em outra máquina. As URLs do Keycloak saem do
   `PUBLIC_URL`; o nginx repassa `X-Forwarded-Proto/Host`. Pro IP real do cliente, ative o
   `set_real_ip_from` em `uzusis-front/nginx.conf`.

## CI/CD e deploy

O [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) roda no GitHub Actions:

- **PR e push na `main`** (CI): compila e testa a API (`mvn package`, Java 21) e builda o
  front (`ng build`, Node 22).
- **Push na `main`** (CD): publica duas imagens no GHCR —
  `ghcr.io/gabriel-richard-dev/uzusis-api` (as 6 services Java, por `MODULO`) e
  `…/uzusis-web` (front/nginx), tags `latest` e `sha` — e faz deploy por SSH.

**Deploy:** o [`docker-compose.prod.yml`](docker-compose.prod.yml) troca `build:` por `image:`
(puxa do GHCR). O job entra por SSH na prod (que precisa estar na branch `main`) e roda:

```bash
git fetch origin main && git checkout -f main && git reset --hard origin/main
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans
```

O `.env` da prod sobrevive (é gitignored). **Secrets** (Settings → Secrets → Actions):
`PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY` (chave **privada**; a pública no `authorized_keys`
da prod), `PROD_PATH` (caminho absoluto do repo na prod) e `PROD_PORT` (opcional, 22).
As imagens nascem **privadas** no GHCR: deixe os packages públicos ou `docker login ghcr.io` na prod.

## Pagamentos (Stripe)

Sem chaves, sobe normal: `/api/pagamentos/config` → `{"habilitado":false}` e o checkout avisa.
Com chaves de teste:

1. `.env`: `STRIPE_SECRET_KEY=sk_test_…`, `STRIPE_PUBLISHABLE_KEY=pk_test_…` (Dashboard → API keys).
2. Segredo do webhook: `docker compose run --rm --no-deps stripe-cli listen --api-key sk_test_… --print-secret`
   → `whsec_…` (fixo por conta, pega uma vez).
3. `.env`: `STRIPE_WEBHOOK_SECRET=whsec_…`. O `stripe-cli` **sobe junto** (`restart: unless-stopped`)
   e encaminha os webhooks pra `http://web/api/webhooks/stripe` — logo precisa do `STRIPE_SECRET_KEY`,
   senão fica reiniciando.
4. `docker compose up -d`.

Cartão aprovado `4242 4242 4242 4242`; recusado `4000 0000 0000 0002` (pedido → `CANCELADO`,
itens voltam à sacola).

Em vez do túnel do stripe-cli, dá pra cadastrar no Dashboard o endpoint
`${PUBLIC_URL}/api/webhooks/stripe` (eventos `payment_intent.succeeded`/`…payment_failed`). Sem
webhook algum, a reconciliação do payment-service confirma os pendentes a cada 2 min (antes dos
30 min de expiração).

## Teste ponta a ponta (e2e)

Compra inteira pela API com Stripe falso (`stripe-mock`) e webhooks assinados localmente.
Precisa de `curl`, `jq`, `openssl`.

```bash
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --build
bash scripts/e2e-compra.sh            # termina com "E2E OK"
docker compose up -d --remove-orphans # volta ao normal
```

Outra porta: `env WEB_PORT=8088 PUBLIC_URL=http://localhost:8088 …` e
`env BASE_URL=http://localhost:8088 bash scripts/e2e-compra.sh`. Deixa alguns pedidos pras telas do admin.

## Dados de exemplo

```bash
bash scripts/seed-dev.sh
```

~12 produtos (estoque PP–GG, fotos geradas) pela API do catálogo. Rodar de novo pula os que já existem.

## Front (Angular 22)

Standalone, Tailwind 4 e [spartan/ui](https://www.spartan.ng) (shadcn, em `libs/ui`). Testes
Vitest+jsdom; build esbuild em `dist/uzusis/browser`, copiado pro nginx. Exige Node
`^22.22.3 || ^24.15` — sem ele no host, rode no contêiner a partir da raiz:

```bash
alias dnode='docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -e npm_config_cache=/tmp/.npm -v "$HOME/.npm":/tmp/.npm -v "$PWD/uzusis-front":/app -w /app node:22-alpine'
mkdir -p ~/.npm
dnode npm ci --no-audit --no-fund     # após mudar o package-lock.json
dnode npx ng build                    # → uzusis-front/dist/uzusis/browser
dnode npx ng test --watch=false
```

Dev server (com o compose no ar):
`docker run --rm -it --network host -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD/uzusis-front":/app -w /app node:22-alpine npx ng serve`
→ http://localhost:4200 (o `proxy.conf.json` e `environment.development.ts` apontam pra 8080;
ajuste local se mudar a porta). Novo componente spartan: instale `@spartan-ng/cli@1.5.0` só na
geração (`npx ng g @spartan-ng/cli:ui <nome>`) e desinstale; ajustes à mão no `SPEC.md` §7.4.

## Observabilidade

```bash
env TRACING_ENABLED=true docker compose --profile observability up -d
```

Jaeger em http://127.0.0.1:16686. Sem o perfil, sem traces.

## Reimportar o realm

O Keycloak só importa `uzusis-api/infra/keycloak/import/uzusis-realm.json` quando o realm não
existe (as URLs de redirect congelam no 1º boot). **Obrigatório** quando `PUBLIC_URL`/`WEB_PORT`
mudam ("Invalid redirect uri"), um 1º `up` falhou após o import, ou o `uzusis-realm.json` mudou:

```bash
docker compose stop keycloak
docker compose exec postgres psql -U postgres -c 'DROP DATABASE keycloak WITH (FORCE)' -c 'CREATE DATABASE keycloak'
docker compose up -d keycloak
```

Recria **todos** os usuários do realm (os do cadastro somem; `admin@`/`cliente@` voltam com
outro `sub`). Pedidos/sacola/perfil ficam no banco mas presos ao `sub` antigo (somem de "Minha
conta"; o admin ainda os lista).

## Debezium (outbox → Kafka)

Os eventos da saga saem da tabela `outbox` (catalog, order, payment) via Debezium; `connect-init`
registra os conectores a cada `up` (idempotente).

- Diagnóstico: `docker compose exec connect curl -s 'http://localhost:8083/connectors?expand=status'`
  (os `outbox-*` em `RUNNING`).
- Slot de replicação parado segura WAL (limite 1 GB); se invalidar, a saga para **em silêncio**.
  Recuperar (ex. order):

  ```bash
  docker compose exec connect curl -s -X DELETE http://localhost:8083/connectors/outbox-order
  docker compose exec postgres psql -U postgres -d orders -c "select pg_drop_replication_slot('outbox_order')"
  docker compose up connect-init
  ```

  Com `snapshot.mode=when_needed` ele refaz o snapshot da outbox e reenvia; os consumidores
  ignoram o já processado.

## Volume antigo do MySQL

`uzusis_db-data` guarda o MySQL da versão .NET (fora do repo). Nada usa, o compose não toca
(nem com `down -v`). Para migrar um dia, veja o Apêndice A do [`SPEC.md`](SPEC.md).

## Notas

- **MinIO**: imagem `pgsty/minio` (mesmo binário; `minio/minio` saiu do Docker Hub). Fotos no
  volume `uzusis_fotos-data`.
