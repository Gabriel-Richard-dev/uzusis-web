# Uzusis

Loja de roupas femininas: microserviços Java (Spring Boot, Kafka, Postgres,
Keycloak, Stripe, MinIO) e front Angular 16 servido por nginx, tudo em Docker
Compose. Detalhes do backend em [`uzusis-java/README.md`](uzusis-java/README.md).

> **Nunca rode `docker compose down -v`.** O `-v` apaga os volumes: o MySQL
> legado, as fotos dos produtos, os pedidos e os usuários do Keycloak. Para
> parar, use `docker compose stop` ou `docker compose down` (sem `-v`).

## Subir

```bash
docker compose up -d --build
```

Não precisa de `.env`: toda variável tem padrão. O [`.env.example`](.env.example)
documenta todas; para mudar alguma, copie para `.env` ou use `env VAR=valor docker compose ...`.

- Na primeira vez sobe tudo em alguns minutos (build Maven + Angular, import do realm).
- Em máquina com pouca RAM (menos de ~4 GB livres), construa o front antes do resto,
  para o `ng build` e o Maven não rodarem juntos:
  `docker compose build web && docker compose up -d --build`.
- Porta 8080 ocupada? Mude as duas juntas:
  `env WEB_PORT=8088 PUBLIC_URL=http://localhost:8088 docker compose up -d --build`
  (e veja [Reimportar o realm](#reimportar-o-realm) se o Keycloak já tinha subido em outra porta).

`docker compose ps -a` deve mostrar tudo `healthy`/`running`, e os one-shots
`minio-init` (bucket de fotos) e `connect-init` (conectores do Debezium) em `Exited (0)`.

## Endereços e portas

Só duas portas vão para o host, ambas em `127.0.0.1` (só esta máquina alcança;
`WEB_BIND=0.0.0.0` abre a loja para a rede). O resto fica na rede interna do compose.

| O quê | Endereço |
|---|---|
| Loja e painel admin | http://localhost:8080 (`WEB_PORT`) |
| Console do Keycloak | http://localhost:8080/auth/admin (`admin` / `admin`) |
| E-mails de dev (Mailpit) | http://127.0.0.1:8025 (`MAILPIT_PORT`) |
| Traces (Jaeger, perfil `observability`) | http://127.0.0.1:16686 |

O nginx do `web` é a origem única: `/` é o SPA, `/api` vai para o gateway,
`/auth` para o Keycloak e `/storage` para as fotos no MinIO (só GET de objeto;
listar o bucket dá 404). `/actuator` não é exposto.

Usuários de teste do realm (só dev): `admin@uzusis.local` / `admin123` (ADMIN) e
`cliente@uzusis.local` / `cliente123` (CUSTOMER). Cadastro, verificação de
e-mail e "esqueci minha senha" são do Keycloak; os e-mails caem no Mailpit.

### Fora de dev

As senhas acima são públicas; em dev isso é aceitável porque só esta máquina
alcança a loja. Antes de expor o stack:

1. **Antes do primeiro `up`**, ponha no `.env` senhas fortes em `POSTGRES_PASSWORD`,
   `KEYCLOAK_ADMIN_PASSWORD`, `MINIO_ROOT_PASSWORD` e nas dos usuários de banco
   (`CATALOG_DB_PASSWORD`, `ORDERS_DB_PASSWORD`, `PAYMENTS_DB_PASSWORD`,
   `NOTIFICATIONS_DB_PASSWORD`, `IDENTITY_DB_PASSWORD`; o `init.sql`, os serviços e
   o registrar do Debezium leem todas daí). O Postgres e o Keycloak só usam essas
   senhas ao criar os dados: mudar o `.env` depois não troca a senha do admin do
   Keycloak (`admin`/`admin` continua valendo) e faz o Keycloak e os serviços
   falharem ao entrar no Postgres com a senha nova.
2. **Stack que já subiu uma vez**: troque primeiro onde a senha mora, depois no
   `.env`, e rode `docker compose up -d` (recria quem usa a senha):
   - Postgres: `docker compose exec postgres psql -U postgres -c "ALTER USER postgres PASSWORD 'nova'"`
     (e o mesmo para `catalog`, `orders`, `payments`, `notifications` e `identity`);
   - admin do Keycloak: console `/auth/admin`, realm `master` → Users → `admin` →
     Credentials → Reset password (com "Temporary" desligado);
   - MinIO: basta o `.env`.
3. **Usuários de teste do realm**: no console, realm `uzusis` → Users → Add user,
   crie o seu admin ("Email verified" ligado; depois Credentials → Set password e
   Role mapping → Assign role → filtro "Filter by realm roles" → `ADMIN`), entre com
   ele e apague `admin@uzusis.local` e `cliente@uzusis.local`. Ou, antes do primeiro
   `up`, tire o bloco `users` de `uzusis-java/infra/keycloak/import/uzusis-realm.json`
   (o e2e e o `seed-dev.sh` usam esses usuários; por isso eles existem em dev).
4. **Password grant**: realm `uzusis` → Clients → `admin-cli` → Capability config →
   desligue "Direct access grants" (só os scripts de dev usam).
5. **SMTP real**: `SMTP_*`, `EMAIL_FROM` e `SMTP_FROM` (só o endereço) no `.env`. O
   notification-service lê a cada `up`; o Keycloak (verificação de cadastro e
   "esqueci minha senha") só no import do realm. Stack que já subiu: realm `uzusis` →
   Realm settings → Email, ou [reimporte o realm](#reimportar-o-realm).
6. **TLS**: um proxy de borda com TLS na frente do `web`, `PUBLIC_URL=https://…`
   ([reimporte o realm](#reimportar-o-realm) se já subiu com outra) e
   `WEB_BIND=0.0.0.0` se o proxy estiver em outra máquina. As URLs do Keycloak
   (issuer, token, jwks) saem todas de `PUBLIC_URL`, e o nginx repassa ao Keycloak o
   `X-Forwarded-Proto`/`X-Forwarded-Host` que o proxy mandar. Para o Keycloak registrar o IP
   real do cliente, ative o `set_real_ip_from` comentado em `uzusis-front/nginx.conf`
   (e `docker compose up -d --build web`).

## Pagamentos (Stripe)

Sem chaves o sistema sobe normalmente: `/api/pagamentos/config` responde
`{"habilitado":false}` e o checkout avisa "Pagamento ainda não configurado".

**Em dev, com chaves de teste:**

1. No `.env`: `STRIPE_SECRET_KEY=sk_test_…` e `STRIPE_PUBLISHABLE_KEY=pk_test_…`
   (Dashboard → Developers → API keys).
2. Pegue o segredo de webhook do stripe-cli:
   `docker compose run --rm --no-deps stripe-cli listen --api-key sk_test_… --print-secret` → `whsec_…`
   (o `--no-deps` evita recriar o `web`; o segredo é fixo por conta, basta pegar uma vez).
3. No `.env`: `STRIPE_WEBHOOK_SECRET=whsec_…` e `COMPOSE_PROFILES=stripe`
   (o stripe-cli passa a subir junto, com `restart: unless-stopped`, e encaminha os
   webhooks para `http://web/api/webhooks/stripe`).
4. `docker compose up -d`.

Cartão aprovado: `4242 4242 4242 4242`. Recusado: `4000 0000 0000 0002` → o
pedido vai para `CANCELADO` e os itens voltam para a sacola.

**Em produção:** sem stripe-cli. Cadastre no Dashboard o endpoint
`${PUBLIC_URL}/api/webhooks/stripe` com os eventos `payment_intent.succeeded` e
`payment_intent.payment_failed`, e use o `whsec_…` dele.

Sem stripe-cli nem endpoint cadastrado, o webhook se perde, mas a reconciliação
do payment-service confere os pagamentos pendentes a cada 2 min: o pedido é
confirmado com alguns minutos de atraso, bem antes de expirar (30 min).

## Teste ponta a ponta (e2e)

Roda a compra inteira pela API com um Stripe falso (`stripe-mock`, só no
override) e webhooks assinados localmente. Precisa de `curl`, `jq` e `openssl`.

```bash
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --build
bash scripts/e2e-compra.sh            # termina com "E2E OK"
docker compose up -d --remove-orphans # volta ao produto (sem o stripe-mock)
```

Com outra porta: `env WEB_PORT=8088 PUBLIC_URL=http://localhost:8088 docker compose ...`
e `env BASE_URL=http://localhost:8088 bash scripts/e2e-compra.sh`. O e2e desativa o
produto que cria, mas deixa alguns pedidos (pagos e enviado) para as telas do admin.

## Dados de exemplo

```bash
bash scripts/seed-dev.sh              # ou: env BASE_URL=http://localhost:8088 bash scripts/seed-dev.sh
```

Cria uns 12 produtos com estoque PP–GG e fotos geradas, pela API do catálogo
(token do `admin@uzusis.local`). Rodar de novo pula os que já existem.

## Observabilidade

```bash
env TRACING_ENABLED=true docker compose --profile observability up -d
```

Jaeger em http://127.0.0.1:16686. Sem o perfil, os serviços não exportam traces.

## Reimportar o realm

O Keycloak só importa `uzusis-java/infra/keycloak/import/uzusis-realm.json`
quando o realm ainda não existe, e as URLs de redirect do login (`${PUBLIC_URL}/*`)
ficam congeladas nesse primeiro boot. **Reimportar é obrigatório** quando:

- `PUBLIC_URL` ou `WEB_PORT` mudarem depois do primeiro boot (sintoma: "Invalid
  redirect uri" / "URL de redirecionamento inválida" no login);
- um primeiro `up` falhou (por exemplo, porta ocupada) depois de o Keycloak já ter importado;
- o `uzusis-realm.json` mudou.

Sem apagar fotos, pedidos nem o MySQL:

```bash
docker compose stop keycloak
docker compose exec postgres psql -U postgres -c 'DROP DATABASE keycloak WITH (FORCE)' -c 'CREATE DATABASE keycloak'
docker compose up -d keycloak
```

O reimport recria **todos** os usuários do realm. Os criados pelo cadastro somem, e
`admin@uzusis.local` e `cliente@uzusis.local` voltam com outro `sub` (o arquivo do
realm não fixa o id deles). Pedidos, sacola e perfil continuam no banco, mas presos
ao `sub` antigo: não são mais de ninguém (somem de "Minha conta"; o painel admin
ainda lista os pedidos), e as contas recriadas começam vazias.

## Debezium (outbox → Kafka)

Os eventos da saga saem da tabela `outbox` de catalog, order e payment pelo
Debezium. O `connect-init` registra os três conectores a cada `up` (é idempotente).

- Diagnóstico: `docker compose exec connect curl -s 'http://localhost:8083/connectors?expand=status'`
  (os três `outbox-*` e suas tasks em `RUNNING`).
- Um slot de replicação parado segura WAL no Postgres (limitado a 1 GB por
  `max_slot_wal_keep_size`). Se o slot for invalidado, a saga para **em silêncio**.
  Para recuperar um serviço (`catalog`, `order` ou `payment`; database `catalog`, `orders` ou `payments`):

  ```bash
  docker compose exec connect curl -s -X DELETE http://localhost:8083/connectors/outbox-order
  docker compose exec postgres psql -U postgres -d orders -c "select pg_drop_replication_slot('outbox_order')"
  docker compose up connect-init
  ```

  Os offsets sobrevivem ao `DELETE`, mas o conector usa `snapshot.mode=when_needed`:
  ao ver que a posição salva não existe no slot novo, ele refaz o snapshot da outbox
  (as linhas nunca são apagadas) e reenvia tudo; os consumidores ignoram o que já processaram.

## Legado (.NET + MySQL)

O .NET e o MySQL antigos ficam no perfil `legacy` e não sobem por padrão. Os
dados continuam no volume `uzusis_db-data`. As credenciais originais do MySQL
não estão no repositório:

```bash
env DB_ROOT_PASSWORD=… DB_USER=… DB_PASSWORD=… DB_NAME=uzusis docker compose --profile legacy up -d db api
```

A API .NET responde em `127.0.0.1:5141` (`API_PORT`); os scripts antigos estão
em `scripts/legacy/`. A migração dos dados para o Java é um procedimento manual,
descrito em [`uzusis-java/README.md`](uzusis-java/README.md#migrar-os-dados-do-net).

## Notas

- **MinIO**: a imagem é `pgsty/minio` (build comunitário do mesmo binário), porque
  `minio/minio` e `minio/mc` saíram do Docker Hub. As fotos ficam no volume novo
  `uzusis_fotos-data`; o `uzusis_minio-data` do .NET não é montado e fica intocado
  (o bucket dele estava vazio).
- **Front em dev** (`cd uzusis-front && npm start`): o `ng serve` usa o proxy de
  `proxy.conf.json` para `/api` e `/storage` em `http://localhost:8080` e o Keycloak
  em `http://localhost:8080/auth`, então o compose precisa estar no ar nessa porta.
