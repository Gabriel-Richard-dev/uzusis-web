# SPEC — Uzusis: microserviços Java e loja Angular

Documento executável: agentes vão implementar isto **sem poder perguntar**. Quando algo não estiver
aqui, vale a regra mais simples que cumpra o contrato. Os contratos (§4, §5) são a fonte da verdade para
backend e front. Quem precisar mudar um contrato fala com a integração (§10); não muda sozinho.

**Implementado.** Este documento descreve o sistema como ele ficou. Nasceu como o plano de migração do .NET para
Java; as divergências da execução foram incorporadas às seções. O .NET e o MySQL já foram **removidos** do
repositório, e o backend Java, que morava em `uzusis-java/`, agora é `uzusis-api/`. O front passou de Angular 16 +
Material para Angular 22 standalone + Tailwind 4 + spartan/ui (§7).

**Estado final (2026-09-26).** Verificado em `WEB_PORT=8088`:
- front: `ng build` de produção sem avisos (inicial de 843,19 kB); `ng test` (Vitest + jsdom em `node:22-alpine`)
  com 63 testes em 18 arquivos; imagem `web` reconstruída; os fluxos de UI (a)–(h) e da busca de §11.7 passaram em
  1440 e 390, sem rolagem horizontal; o selo "Últimas unidades" (estoque total 1..3) conferido com um produto
  temporário;
- compra pela UI com o Payment Element de verdade (chaves de teste da Stripe, `COMPOSE_PROFILES=stripe`): pedido
  `PAGO`, inclusive retomando um pedido `CRIADO` por "Concluir pagamento";
- backend: `mvn -f uzusis-api/pom.xml -B verify` verde com 144 testes (common 11, catalog 27, order 32, payment 44,
  notification 8, identity 17, gateway 5); `docker compose up -d --build` com tudo healthy e `E2E OK` com o
  stripe-mock (32 passos), já depois da remoção do .NET e da renomeação.

Pendência:
- o realm vivo **não** foi reimportado depois da última mudança do `uzusis-realm.json` (o `DROP DATABASE keycloak`
  foi negado). Comparado pela Admin API, ele é equivalente ao arquivo: o SMTP vivo é igual aos padrões dos
  placeholders, e o `web-app` só difere nos `${PUBLIC_URL}` resolvidos.

Base factual: relatórios de auditoria (`map-dotnet`, `map-java`, `map-front-integration`,
`map-front-ui`, `map-infra`) e leitura do código em `b0752ed`. Fatos técnicos verificados durante a escrita desta
spec, que justificam decisões abaixo:

- Testcontainers **1.21.3 falha** com o Docker Engine 29.4.3 (API mín. 1.40): *"client version 1.32 is too old"*.
  **1.21.4 funciona**. `~/.testcontainers.properties` **não existe** e deve continuar assim: com `DOCKER_HOST`
  no ambiente, a estratégia usada é `EnvironmentAndSystemPropertyClientProviderStrategy`, cujo `isPersistable()`
  devolve `false` (conferido com `javap` na 1.21.4). Por isso o surefire recebe `DOCKER_HOST` (§6.1).
- Spring Boot **3.3.4** (tem `-Djarmode=tools`). Em `b0752ed` só o `PaymentApplication` tinha `@EnableScheduling`
  (o `OrderApplication` ganhou o dele, §6.3). Não há
  `maven-failsafe-plugin` configurado: teste com sufixo `IT` **não roda** no `mvn verify`.
- `@PreAuthorize` negado lança `AuthorizationDeniedException` **dentro** do controller. Um `@ExceptionHandler(Exception.class)`
  a captura antes do `ExceptionTranslationFilter` e devolve 500 (§4.0 trata isso).
- `stripe/stripe-mock` gera ids aleatórios em `POST /v1/payment_intents` (dois creates → dois `pi_…`
  diferentes), aceita `payment_method_types`, `cancel` e `refunds`. `retrieve` devolve sempre
  `status: requires_payment_method`, então a reconciliação não mexe nos pedidos do e2e. O `client_secret` é **fixo** e
  **não** contém o id do intent. Por isso a resposta de client-secret passa a devolver `paymentIntentId` (§4.4).
  Ele só aceita chave com exatamente 3 partes separadas por `_` (`sk_test_e2emock` passa; `sk_test_e2e_mock` dá 401; §8.4).
- `stripe-java 26.11.0`: `StripeClient.builder().setApiBase(String)` existe, e `PaymentIntentService.cancel(...)` também.
  `Webhook.constructEvent` desserializa **antes** de conferir a assinatura: JSON malformado lança `JsonSyntaxException`.
- `angular-oauth2-oidc@22.0.2` (peer `@angular/core >=22`) tem a mesma API pública da 16.0.0 (d.ts comparados).
  Angular 22 exige Node `^22.22.3 || ^24.15` e TypeScript `>=6.0 <6.1`; com TS 6, `baseUrl` no `tsconfig` vira erro (TS5101).
- Compose v5.1.3: vários serviços com o mesmo `image:` + `build:` geram **um** build (o bake deduplica).
  Interpolação aninhada `${PUBLIC_URL:-http://localhost:${WEB_PORT:-8080}}` funciona.
- Imagens: `eclipse-temurin:21-jre-alpine` tem `wget`, não tem `curl`; `quay.io/keycloak/keycloak:26.0` é a 26.0.8;
  `apache/kafka:3.8.0` tem `nc` do busybox; `quay.io/debezium/connect:3.0.0.Final` (2,16 GB) tem `curl` e `sed`,
  **não** tem `jq`; `pgsty/minio:RELEASE.2026-08-04T00-00-00Z` é um build comunitário do MinIO, com `minio` e `mc`.
  **`minio/minio` e `minio/mc` não existem mais no Docker Hub** (pull access denied) — nunca usá-los.
- Volumes antigos, do tempo do .NET: `uzusis_minio-data`, com o bucket `produtos` **vazio** (0 objetos), e
  `uzusis_db-data` (MySQL 8.0 com dados, cerca de 190 MB, database `uzusis`). As credenciais originais do MySQL
  **não** estão no repositório. O compose não monta nem apaga nenhum dos dois; o `uzusis_db-data` fica guardado
  para uma eventual migração dos dados (Apêndice A).

---

## 1. Objetivo, escopo e fora do escopo

### Objetivo
O Uzusis (loja de roupas femininas) roda só com os microserviços Java (`uzusis-api/`) e o front Angular
(`uzusis-front/`), tudo containerizado. O .NET antigo foi desligado e removido do repositório.
`docker compose up -d --build` na raiz sobe o sistema funcional: vitrine, sacola, checkout com Stripe (quando houver
chaves), conta do cliente, painel admin e e-mails.

### Escopo
- Correções de boot e de correção da saga no backend (D5).
- As lacunas funcionais que prendiam o .NET (D6): fotos em MinIO, estoque por tamanho, frete, endereço de
  entrega, listas e resumo do admin e e-mails HTML.
- Autenticação 100% Keycloak (D3), com o tema da marca.
- Pagamento Stripe real, opcional por configuração (D4), e teste e2e sem chaves reais (stripe-mock).
- Front em Angular 22 standalone + Tailwind 4 + spartan/ui (D7).
- Compose único na raiz, nginx como origem única (D1, D2).

### Fora do escopo (com o porquê)
| Item | Por quê |
|---|---|
| **Migração dos dados do MySQL antigo → Postgres/Keycloak como código** | É uma execução única sobre uma base pequena. Depende de decisões humanas: formato real do hash Argon2, e-mails duplicados por caixa, nomes de estado ("Ceará" → CE). Código de migração seria mantido e testado para rodar uma vez, e acoplaria os schemas de 3 serviços num script. Fica como **procedimento** manual no Apêndice A, a partir do volume `uzusis_db-data`. |
| CSP (Content-Security-Policy) | A Stripe exige uma lista de domínios que muda (js.stripe.com, m.stripe.network, hooks…). Uma CSP errada quebra o pagamento em silêncio. Risco anotado em §12. |
| Rate limiting, ShedLock, várias réplicas, alertas de DLQ | Uma réplica em dev. Ficam os comentários `ponytail:` que já existem. |
| Carrinho de visitante, cupom (o "10% na primeira compra" dos banners), frete por CEP/Correios, nota fiscal | Não existiam no .NET nem estão nas decisões. Os banners com a promessa foram apagados. |
| Pix e boleto | São assíncronos: o QR do Pix vale 24 h e o boleto leva dias, mas o pedido expira em 30 min. Um pagamento depois disso viraria estorno. O intent aceita **só cartão** (§6.4). Pix entra no futuro com `payment_method_options.pix.expires_after_seconds` menor que a expiração. |
| `springdoc-openapi` | Não foi pedido. O gateway não roteia `/v3/api-docs` e os serviços não publicam porta, então ninguém alcança a UI. Custa metaspace num limite de 512m. Sai dos 4 poms. |
| App mobile, i18n além de pt-BR, TLS | TLS é do proxy de borda de produção. O cliente `mobile-app` do realm fica como está. |
| Teste automatizado de UI com Stripe real | O Payment Element não funciona com o stripe-mock. O e2e do repositório cobre a saga pela API; a compra com cartão de teste é conferida à parte, com as chaves de teste do usuário (Estado final). |

---

## 2. Arquitetura

### 2.1 Contêineres

`uzusis-api:dev` é **uma** imagem com os 6 jars, construída uma vez; o serviço escolhe o jar por `MODULO`.

| Serviço | Imagem | Porta interna | Publicada no host | Depende de (condition) | mem_limit | Profile |
|---|---|---|---|---|---|---|
| `web` | build `./uzusis-front` (node:22-alpine → nginx:alpine) | 80 | `${WEB_BIND:-127.0.0.1}:${WEB_PORT:-8080}` | gateway, keycloak, minio (`service_started`) | 64m | — |
| `gateway` | `uzusis-api:dev` MODULO=gateway | 8080 | não | — | 384m | — |
| `catalog-service` | `uzusis-api:dev` | 8082 | não | postgres, kafka (`healthy`); minio-init (`completed_successfully`) | 512m | — |
| `order-service` | `uzusis-api:dev` | 8083 | não | postgres, kafka (`healthy`) | 512m | — |
| `payment-service` | `uzusis-api:dev` | 8084 | não | postgres, kafka (`healthy`) | 512m | — |
| `notification-service` | `uzusis-api:dev` | 8085 | não | postgres, kafka (`healthy`); mailpit (`started`) | 512m | — |
| `identity-service` | `uzusis-api:dev` | 8086 | não | postgres (`healthy`) | 512m | — |
| `postgres` | `postgres:16-alpine` | 5432 | não | — | 512m | — |
| `kafka` | `apache/kafka:3.8.0` | 9092 (+9093 controller) | não | — | 768m | — |
| `connect` | `quay.io/debezium/connect:3.0.0.Final` | 8083 | não | kafka, postgres (`healthy`) | 768m | — |
| `connect-init` (one-shot) | `quay.io/debezium/connect:3.0.0.Final` (entrypoint bash) | — | não | connect, catalog, order, payment (`healthy`) | 128m | — |
| `keycloak` | `quay.io/keycloak/keycloak:26.0` | 8080 (+9000 mgmt) | não | postgres (`healthy`) | 1g | — |
| `minio` | `pgsty/minio:RELEASE.2026-08-04T00-00-00Z` | 9000 (+9001 console) | não | — | 256m | — |
| `minio-init` (one-shot) | a mesma do `minio` (entrypoint sh + mc) | — | não | minio (`healthy`) | 64m | — |
| `mailpit` | `axllent/mailpit:latest` | 1025 / 8025 | `127.0.0.1:${MAILPIT_PORT:-8025}` | — | 64m | — |
| `jaeger` | `jaegertracing/all-in-one:1.62.0` | 4318 / 16686 | `127.0.0.1:16686` | — | 256m | `observability` |
| `stripe-cli` | `stripe/stripe-cli:latest` (`restart: unless-stopped`) | — | não | web (`started`) | 128m | `stripe` |
| `stripe-mock` | `stripe/stripe-mock:latest` | 12111 | não | — | 64m | só em `docker-compose.e2e.yml` |

**JVM** (âncora `x-java-env`, igual em todos os serviços Java):
`JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=50 -XX:+UseSerialGC -Xss512k -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError"`.
O percentual só vale com `mem_limit`, porque a JVM lê o limite do cgroup v2. 50% e não 75% porque metaspace,
code cache e stacks ficam fora do heap.
- Kafka: `KAFKA_HEAP_OPTS=-Xms256m -Xmx512m`. O healthcheck é `nc -z` e **não** abre uma segunda JVM
  (`kafka-topics.sh` herdaria esse heap dentro dos mesmos 768m).
- Connect: `HEAP_OPTS=-Xms256m -Xmx512m`.
- Keycloak: `JAVA_OPTS_KC_HEAP=-Xms128m -Xmx512m` em 1g. O non-heap do Keycloak passa de 300 MB, e o import do realm no primeiro boot é o pico.
- Soma dos limites no default: cerca de 6,4 GB. Uso típico: cerca de 4 GB.

**Build**:
- Java: um único `mvn package` dentro do Docker, com cache BuildKit de `~/.m2` e `MAVEN_OPTS=-Xmx1g`.
  Os 6 jars são extraídos com `-Djarmode=tools` para um `lib/` compartilhado (§8.1). As bibliotecas não se repetem 6 vezes.
- Front: builder `application` (esbuild) em `node:22-alpine`, com `NODE_OPTIONS=--max-old-space-size=2048`.
- Nada de `dependency:go-offline || true`.
- Nesta máquina (3,4 GB livres), `docker compose build web` roda **antes** de `docker compose build`, porque o bake
  roda o Maven (1 GB) e o `ng build` (2 GB) juntos.

### 2.2 Fluxo

```
Navegador ── PUBLIC_URL (padrão http://localhost:8080) ──► web (nginx :80)  ← único ponto publicado, em 127.0.0.1 por padrão (+ Mailpit 127.0.0.1:8025)
  ├─ /              → SPA Angular (estático, fallback index.html)
  ├─ /api/**        → gateway:8080  (URI mantida com /api; o gateway faz StripPrefix=1)
  │     ├─ /api/produtos/**                        → catalog-service:8082 ──S3──► minio:9000
  │     ├─ /api/carrinho/**, /api/pedidos/**       → order-service:8083 ──HTTP GET /produtos/{id}──► catalog-service:8082
  │     ├─ /api/pagamentos/**, /api/webhooks/stripe→ payment-service:8084 ──HTTPS──► api.stripe.com (ou stripe-mock:12111)
  │     └─ /api/perfil/**                          → identity-service:8086
  ├─ /auth/**       → keycloak:8080  (KC_HTTP_RELATIVE_PATH=/auth; X-Forwarded-*)
  └─ /storage/**    → minio:9000     (prefixo /storage removido; só GET/HEAD de objeto; listar → 404)

Serviços (gateway, catalog, order, payment, identity):
  validam  iss = ${PUBLIC_URL}/auth/realms/uzusis e typ = Bearer (só access token)
  buscam   JWKS em http://keycloak:8080/auth/realms/uzusis/protocol/openid-connect/certs (rede interna)
  gateway  cache de DNS limitado a 5 s (serviço recriado com outro IP volta em segundos)

Saga: catalog/order/payment ──INSERT outbox (mesma tx)──► Postgres WAL ──► connect (Debezium EventRouter)
      ──► kafka (tópico = coluna topic) ──► consumidores (catalog, order, payment, notification)
notification-service ──SMTP──► mailpit:1025
stripe-cli (profile stripe) ── listen --forward-to http://web/api/webhooks/stripe
```

### 2.3 Rede e volumes
- **Rede**: a `default` do projeto (`uzusis_default`, que já existe). Nenhum serviço interno publica porta.
- **Volumes** (`name: uzusis` no compose preserva os nomes):

| Volume | Uso |
|---|---|
| `uzusis_fotos-data` | Fotos do catálogo (bucket `produtos`). |
| `uzusis_pg-data` | Postgres com 5 databases + `keycloak`. |
| `uzusis_kafka-data` | Kafka. |

Fora do compose (nem declarados, nem montados): `uzusis_db-data`, o MySQL do .NET removido, guardado para uma
eventual migração dos dados (Apêndice A), e `uzusis_minio-data`, o MinIO antigo (vazio).

⚠ **Nunca** rodar `docker compose down -v`: isso apaga as fotos, os pedidos e os usuários do Keycloak. O
`uzusis_db-data`, por não estar no compose, não é apagado por ele. Para reimportar o realm, veja §8.3.

### 2.4 Contrato de variáveis de ambiente

**Arquivo `.env` (raiz, opcional; o `.env.example` documenta).** Sem `.env`, valem os padrões do compose.
Todas as variáveis têm padrão; nenhuma usa `${VAR:?}`.

| Variável | Quem usa | Padrão | Obrigatória |
|---|---|---|---|
| `COMPOSE_PROFILES` | compose | vazio | não. `stripe` liga o `stripe-cli`; só faz sentido com as chaves (§8.4) |
| `WEB_PORT` | web (porta do host) | `8080` | não |
| `WEB_BIND` | web (interface do host) | `127.0.0.1` | não. Só esta máquina alcança a loja (os usuários de teste do realm têm senha pública); `0.0.0.0` abre para a rede (proxy de borda em outra máquina) |
| `PUBLIC_URL` | keycloak (`KC_HOSTNAME=${PUBLIC_URL}/auth`, placeholders do realm), Java (`KEYCLOAK_ISSUER`), notification (links do e-mail), e2e | `http://localhost:${WEB_PORT}` | não. Mudar junto com `WEB_PORT`. Mudar depois do primeiro boot exige reimportar o realm (§8.3, R16) |
| `MAILPIT_PORT` | mailpit (host, 127.0.0.1) | `8025` | não |
| `POSTGRES_PASSWORD` | postgres, keycloak | `postgres` | não. Só vale no primeiro boot (volume `pg-data` vazio); depois, `ALTER USER` (README, "Fora de dev") |
| `CATALOG_DB_PASSWORD`, `ORDERS_DB_PASSWORD`, `PAYMENTS_DB_PASSWORD`, `NOTIFICATIONS_DB_PASSWORD`, `IDENTITY_DB_PASSWORD` | postgres (`init.sql`, por `\getenv`), o serviço dono (`DB_PASSWORD`), `connect-init` (registrar do Debezium) | o nome do database (`catalog`, `orders`…) | não. Como `POSTGRES_PASSWORD`, só no primeiro boot |
| `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` | keycloak (admin bootstrap do realm master), e2e | `admin` / `admin` | não (trocar fora de dev; só vale no primeiro boot, depois é no console) |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | minio, minio-init, catalog | `uzusis` / `uzusis-minio-dev` | não |
| `MINIO_BUCKET` | minio-init, catalog | `produtos` | não |
| `STRIPE_SECRET_KEY` | payment, stripe-cli | vazio | **não**: vazio = pagamento desabilitado |
| `STRIPE_PUBLISHABLE_KEY` | payment (`/api/pagamentos/config`) | vazio | não |
| `STRIPE_WEBHOOK_SECRET` | payment | vazio | não; vazio = todo webhook recusado |
| `STRIPE_API_BASE` | payment (só e2e) | vazio (= api.stripe.com) | não |
| `STRIPE_MOEDA` | payment | `brl` | não |
| `FRETE_PADRAO` | order | `40.00` | não |
| `FRETE_POR_UF` | order | `CE=10.00` (formato `UF=valor[,UF=valor]`) | não |
| `PEDIDO_EXPIRACAO_MINUTOS` | order | `30` | não |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_AUTH` / `SMTP_STARTTLS` | notification (a cada `up`); keycloak (placeholders do `smtpServer` do realm, só no import) | `mailpit` / `1025` / vazio / vazio / `false` / `false` | não |
| `EMAIL_FROM` | notification | `Uzusis <nao-responda@uzusis.local>` | não |
| `SMTP_FROM` | keycloak (`smtpServer.from` do realm, só no import) | `nao-responda@uzusis.local` | não. Só o endereço: o `from` do Keycloak não aceita a forma `Nome <addr>` do `EMAIL_FROM` |
| `TRACING_ENABLED` | todos os Java (`MANAGEMENT_TRACING_ENABLED`) | `false` | não |

> O `.env.example` do .NET tinha `EMAIL_SERVER=smtp.gmail.com`. Com um `.env` copiado dele, o Mailpit
> seria ignorado. Por isso o notification lê `SMTP_*`, **não** `EMAIL_*` do `.env`. Se existir um `.env`, ele é do
> usuário e nunca é editado: para sobrescrever, use `env VAR=… docker compose …`.

**Nomes internos (fixos no compose, iguais em todo `application.yml`):**

| Env | Serviços | Valor no compose | Padrão no yml (execução pela IDE) |
|---|---|---|---|
| `SERVER_PORT` | todos os Java | 8080/8082/8083/8084/8085/8086 | o mesmo |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | catalog, order, payment, notification, identity | `jdbc:postgresql://postgres:5432/<db>`, usuário = `catalog`/`orders`/`payments`/`notifications`/`identity`, senha = `${<DB>_DB_PASSWORD}` (padrão = o usuário) | inalterado |
| `KAFKA_BOOTSTRAP` | catalog, order, payment, notification | `kafka:9092` | `localhost:9092` |
| `KEYCLOAK_ISSUER` | gateway, catalog, order, payment, identity | `${PUBLIC_URL}/auth/realms/uzusis` | `http://localhost:8080/auth/realms/uzusis` |
| `KEYCLOAK_JWKS_URI` | idem | `http://keycloak:8080/auth/realms/uzusis/protocol/openid-connect/certs` | `http://localhost:8080/auth/realms/uzusis/protocol/openid-connect/certs` |
| `MANAGEMENT_TRACING_ENABLED`, `TRACE_SAMPLING`, `OTLP_ENDPOINT` | todos | `${TRACING_ENABLED:-false}`, 1.0, `http://jaeger:4318/v1/traces` | — |
| `CATALOG_URL`, `ORDER_URL`, `PAYMENT_URL`, `IDENTITY_URL` | gateway (e `CATALOG_URL` no order) | `http://<serviço>:<porta>` | inalterado |
| `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_PUBLIC_PREFIX` | catalog | `http://minio:9000`, root user, root password, `produtos`, `/storage` | `http://localhost:9000`, …, `/storage` |
| `EMAIL_SERVER/PORT/USER/PASSWORD/AUTH/TLS`, `EMAIL_FROM`, `PUBLIC_URL` | notification | vindos de `SMTP_*` | inalterado |

Removidas: `ORDER_CLIENT_SECRET`, `LEGACY_API_URL`, `GATEWAY_PORT`, `CONNECT_PORT`, `JAEGER_PORT`, no keycloak
`KC_HOSTNAME_BACKCHANNEL_DYNAMIC` (§8.1), e as do .NET no `.env` (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `JWT_KEY`, `ADMIN_*`, `EMAIL_USER/PASSWORD/SERVER/PORT`,
`ASPNETCORE_ENVIRONMENT`, `API_PORT`): o compose não as lê mais, e um `.env` antigo com elas é ignorado nesse ponto.

---

## 3. Decisões

**D1. Produto final = Java + Angular, tudo em contêiner.**
- Um `docker-compose.yml` na raiz com `name: uzusis`, e build multi-stage de tudo.
- O compose e o `.env.example` que existiam dentro do diretório Java foram apagados; o conteúdo veio para a raiz.
- O .NET e o MySQL saíram do repositório (código, serviços `db`/`api`, perfil `legacy` e `scripts/legacy/`), e o
  diretório Java foi renomeado de `uzusis-java/` para `uzusis-api/`. O volume `uzusis_db-data` fica no disco, fora do
  compose (Apêndice A).
- A rota `legado-dotnet` do gateway é removida.
- *Porquê:* a rota não funcionava. Os tokens do .NET eram HS256 e o gateway exige um JWT do Keycloak. Ela ainda expunha o
  `POST /administradorauth/adicionar` anônimo e o reset de senha sem código a qualquer usuário autocadastrado.
  Na prática a virada foi big-bang.

**D2. Origem única, sem `/etc/hosts`.**
- O nginx do `web` é o único publicado; faz proxy de `/api`, `/auth` e `/storage`.
- O `iss` é a URL pública; a JWKS vem pela rede interna.
- *Porquê:*
  - Some o conflito de porta 8080 entre o Keycloak e o web.
  - Some o CORS.
  - O token é o mesmo para navegador e serviços.
  - Com `issuer-uri` + `jwk-set-uri`, o Spring valida o claim sem fazer discovery na URL pública, que é
    inalcançável de dentro do contêiner.
- Jaeger fica em `observability`, porque consome memória e é opcional.

**D3. Keycloak 26, Authorization Code + PKCE, client público `web-app`.**
- Front com `angular-oauth2-oidc@22.0.2` e refresh via refresh token.
- As telas próprias de login, cadastro, código, esqueci-senha e login-adm são **apagadas**.
- Cadastro, verificação de e-mail e reset ficam no Keycloak, com SMTP no Mailpit, pt-BR e `CUSTOMER` como papel padrão.
- Temas de login **e de e-mail** com a marca (só CSS, imagem e mensagens; sem SPI nem FTL).
- O admin entra pelo mesmo login.
- CPF, celular, nascimento e endereço ficam no identity-service.
- *Porquê:* seis endpoints de autenticação com falhas graves somem. Não existe senha no nosso código.

**D4. Stripe real, opcional por configuração.**
- Payment Element no front e PaymentIntent no payment-service.
- Sem chave, o stack sobe e `/api/pagamentos/config` responde `{habilitado:false}`; o front bloqueia o
  "finalizar" com uma mensagem clara.
- A publishable key é entregue em runtime.
- `stripe-cli` fica em `profiles:[stripe]`, com `restart: unless-stopped`.
- O e2e usa `docker-compose.e2e.yml` com `stripe-mock` e um webhook assinado localmente.
- Só cartão (`payment_method_types=["card"]`).
- Uma recusa encerra o pedido. O front **nunca** chama `confirmPayment` de novo no mesmo intent; o cliente
  finaliza de novo a partir da sacola restaurada.
- Webhook perdido: a reconciliação confere os intents pendentes a cada 2 min, bem antes da expiração de 30 min.
- *Porquê:* o usuário põe as chaves depois; o CI local não depende da internet para a saga. Sem a reconciliação
  frequente, todo webhook perdido (stripe-cli parado, endpoint não cadastrado) viraria estorno. Sem a regra do
  front, uma 2ª tentativa aprovada cobraria um pedido já cancelado.

**D5. Correções obrigatórias de backend.**
- Debezium: JSON válido, `publication.autocreate.mode=filtered`, registro depois do Flyway por `connect-init`,
  `curl -f`, sem conector de notification.
- order-service sem client OAuth2, porque só chama um GET público.
- Transação real no `ProcessadorDeWebhook`.
- payment consome `order.cancelled`: cancela o intent, ou estorna se já estiver pago. Esse é o **único** caminho de
  estorno: o order deixa de publicar `RefundRequested`, e o tópico e o record saem.
- Job de expiração de pedido `CRIADO`, padrão 30 min, com `@EnableScheduling` no `OrderApplication`.
- Flyway com uma única location.
- Testcontainers 1.21.4, sem arquivo no home (`DOCKER_HOST` no surefire).
- Um teste de context-load por serviço.
- O advice de erros relança `AccessDeniedException`/`AuthenticationException` (senão `@PreAuthorize` vira 500).
- *Porquê:* cada item impede o boot ou faz cobrar pedido cancelado (auditoria `map-java` §0 e §11.2).

**D6. Lacunas funcionais para desligar o .NET.**
- Fotos em MinIO.
- Estoque por tamanho PP–GG sem recriar linhas.
- Categorias com nome em pt-BR.
- Vitrine sem produto esgotado, com ordenação e filtros combinados.
- Soft delete.
- Erros em ProblemDetail pt-BR.
- Endereço snapshot no pedido.
- Frete no backend, incluído no valor cobrado.
- Admin só com pedidos pagos e todos os dados de envio.
- Recebimento pelo cliente.
- Resumo do admin.
- E-mails HTML: pago, cancelado **e enviado**.

Duas decisões desta spec para fechar isso:
1. **Status do pedido no nível do pedido**: `CRIADO → PAGO → ENVIADO → RECEBIDO | CANCELADO`, com
   `POST /pedidos/{id}/enviar` e `/receber`. Os endpoints por item (`/pedidos/itens/**`, `/historico`,
   `/andamento`) são removidos.
   *Porquê:* o admin despacha um pacote, não um item. A linha do tempo da UI é por pedido. Um evento por envio
   fica trivial.
2. **E-mail "pedido enviado" entra**, com o novo tópico `order.order.shipped.v1`.
   *Porquê:* com o envio no nível do pedido, é um record, uma chamada de outbox e um listener. O e-mail de "pago"
   já promete esse aviso.

Mais decisões da spec:
- Quando o pedido é cancelado por **pagamento recusado ou expirado**, os itens **voltam para a sacola**.
  Isso não vale para rejeição de estoque. O pedido e o evento dizem se isso aconteceu (`sacolaRestaurada`); o front
  e o e-mail não interpretam o texto do motivo.
  *Porquê:* a recusa do cartão cancela o pedido (D4), e sem a sacola restaurada o cliente teria de montar tudo de novo.
- **O6 revalida a sacola contra o catálogo** (preço, produto ativo e estoque) antes de criar o pedido.
  *Porquê:* sem isso, um preço antigo da sacola seria cobrado, e um item esgotado cancelaria o pedido inteiro de
  forma assíncrona, sem devolver a sacola.

**D7. Interface nova.**
- Angular 22 standalone (sem NgModules), Tailwind 4 e spartan/ui 1.5 no estilo `vega` (o shadcn clássico): os
  componentes helm são gerados para `libs/ui` e passam a ser código do projeto; o comportamento vem do
  `@spartan-ng/brain` (sobre o CDK).
- Sem Angular Material, `@angular/animations`, bootstrap, ng-bootstrap, popper, primeng, sweetalert2, swiper, moment,
  ng-otp-input, ngx-mask e @angular/localize.
- Fontes: Scope One + Inter. Tema só claro: papel `#faf8f5`, ação em quase preto `#1c1917`, destaque na marca `#7a5a41`.
- Nativo antes de helm: `<select>` nativo, rádios para tamanhos, `<details>` para expansão, links com `aria-current`
  para abas, paginador próprio.
- Rotas lazy por feature, pt-BR/BRL, acessibilidade AA, alvos de 44 px.
- *Porquê:* no Angular 16 havia 4 bibliotecas de UI para cerca de 5 widgets, o Bootstrap Reboot anulava os tokens e
  havia conflito de peer deps (auditoria `map-front-ui` §3). O Material resolveu isso, mas travava o visual pedido
  pelo usuário (inputs arredondados com rótulo acima, botão preto em pílula, pills para tamanhos); o helm é código
  nosso e se ajusta com classes.

**D8. Execução paralela com posse disjunta de diretórios** (§10).

---

## 4. Contratos de API (via gateway, prefixo `/api`)

### 4.0 Convenções
- JSON em camelCase.
- Dinheiro é **número JSON com 2 casas** (`89.90`); os DTOs fazem `setScale(2, HALF_UP)`.
- Datas-hora são ISO-8601 com offset (`"2026-09-25T18:30:00Z"`); datas simples são `"yyyy-MM-dd"`.
- Enums são a string do valor (`"BLUSA"`).
- **Autenticação**: `Authorization: Bearer <access token do Keycloak>`. O papel vem de `realm_access.roles`
  (`ADMIN` ou `CUSTOMER`). O dono do recurso é o `sub` do token, **nunca** um id vindo do corpo ou da URL.
  - Só **access token**: o gateway e os serviços exigem o claim `typ = Bearer`. O ID token do Keycloak tem o mesmo
    `iss`, a mesma chave e o mesmo `sub`, só com `typ = ID`, e vaza no `id_token_hint` do logout; com ele → 401.
  - "auth" = qualquer usuário autenticado.
  - "dono" = o `sub` do recurso é igual ao do token; senão **404**, nunca 403, para não revelar existência.
- **Erros** (todos os serviços servlet, via `common`): `application/problem+json`, RFC 7807, com `detail` **legível em pt-BR**.
  O front mostra `detail`. `erros` só aparece em erro de validação.
  ```json
  {
    "type": "about:blank",
    "title": "Bad Request",
    "status": 400,
    "detail": "Dados inválidos: endereco.uf: UF inválida",
    "instance": "/pedidos",
    "erros": [{ "campo": "endereco.uf", "mensagem": "UF inválida" }]
  }
  ```

  | Situação | Status | `detail` |
  |---|---|---|
  | Bean Validation (`@Valid`) | 400 | `Dados inválidos: <campo>: <msg>; …` + `erros[]` |
  | JSON ilegível ou valor de enum inválido no corpo | 400 | `Valor inválido para o campo <caminho>` ou `Corpo da requisição inválido` |
  | Parâmetro de query ou path com tipo errado | 400 | `Valor inválido para o parâmetro <nome>` |
  | Parâmetro ou parte obrigatória ausente | 400 | `Parâmetro obrigatório ausente: <nome>` |
  | `ResponseStatusException(status, reason)` | status | `reason` |
  | `MaxUploadSizeExceededException` | 413 | `Arquivo maior que 5 MB.` |
  | `DataIntegrityViolationException` | 409 | `A operação conflita com dados existentes.` |
  | Rota inexistente | 404 | `Recurso não encontrado.` |
  | Qualquer outra exceção | 500 | `Erro interno. Tente novamente em instantes.` (stack só no log) |
  | 401/403 do Spring Security (gateway ou serviço) | 401/403 | corpo vazio. O front trata pelo status (§7.4, §7.5). |
  | 502/503/504 do gateway (SCG) ou do nginx; 413 do nginx (> 8 MB) | status | **sem** ProblemDetail (JSON próprio ou HTML). O front trata pelo status (§7.4). |

  O `@PreAuthorize` negado lança `AuthorizationDeniedException` **dentro** do controller, e o handler genérico a
  transformaria em 500. Por isso o `TratadorDeErros` tem um handler que relança:
  `@ExceptionHandler({AccessDeniedException.class, AuthenticationException.class}) void relancar(RuntimeException e) { throw e; }`.
  A exceção sai do `DispatcherServlet`, o `ExceptionTranslationFilter` responde, e um anônimo em rota ADMIN recebe 401 (não 403 nem 500).

  **Mensagens em pt-BR sem depender do cliente**:
  - toda constraint de Bean Validation tem `message` explícita em pt-BR;
  - todo serviço servlet fixa o locale no yml (`spring.web.locale: pt_BR` e `spring.web.locale-resolver: fixed`).
    Sem `Accept-Language` (curl, stripe-cli, testes), o resolver padrão usaria o locale da JVM, que é inglês.
- **Paginação**: o formato `Page` do Spring (serialização DIRECT). O yml do catalog e do order tem
  `spring.data.web.pageable.serialization-mode: direct`, mas a propriedade não existe no Boot 3.3.4 e não tem efeito:
  o formato já sai DIRECT, e fica um WARN de `PageImpl` no log.
  - Garantidos: `content`, `totalElements`, `totalPages`, `number` (base 0), `size`, `first`, `last`.
  - Outros campos (`pageable`, `sort`…) podem vir e devem ser ignorados.
  - Parâmetros: `page` (base 0), `size`, `sort=campo,asc|desc`. `spring.data.web.pageable.max-page-size: 100`.
  ```json
  { "content": [], "totalElements": 37, "totalPages": 4, "number": 0, "size": 12, "first": true, "last": false }
  ```

### 4.1 Enums

**Categorias** (`CategoriaProduto`: a mesma ordem do .NET, com o campo `nomeExibicao`):

| valor | nome |
|---|---|
| `CALCA` | Calça |
| `SHORT` | Short |
| `SAIA` | Saia |
| `CROPPED` | Cropped |
| `CONJUNTOS` | Conjuntos |
| `BLUSAO` | Blusão |
| `BODY` | Body |
| `BLUSA` | Blusa |
| `ACESSORIOS` | Acessórios |

**Tamanhos**: `PP`, `P`, `M`, `G`, `GG`.
- Nesta ordem em toda resposta.
- A entrada é case-insensitive e é gravada em maiúsculas.
- Regex: `(?i)PP|P|M|G|GG`.

**StatusPedido** (rótulo pt-BR só no front):
- `CRIADO` "Aguardando pagamento"
- `PAGO` "Pagamento confirmado"
- `ENVIADO` "Enviado"
- `RECEBIDO` "Recebido"
- `CANCELADO` "Cancelado"

**UF**: as 27 siglas (AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO),
validadas em maiúsculas.

### 4.2 Catálogo (catalog-service)

Objetos:
```json
// ProdutoResposta
{
  "id": 42,
  "nome": "Blusa Linho Areia",
  "preco": 89.90,
  "descricao": "Blusa de linho com botões frontais.",
  "categoria": "BLUSA",
  "categoriaNome": "Blusa",
  "ativo": true,
  "disponivel": true,
  "criadoEm": "2026-09-25T18:30:00Z",
  "tamanhos": [
    { "id": 101, "sigla": "P", "quantidade": 3 },
    { "id": 102, "sigla": "M", "quantidade": 0 }
  ],
  "fotos": [
    { "id": 7, "url": "/storage/produtos/42/3f1c9a0e5b7d4c2a9e1f0b6d8c7a5e43.jpg", "ordem": 0 }
  ]
}
```
- `disponivel` = algum tamanho com `quantidade > 0`.
- `fotos` vem ordenado por `ordem`. Mudou de `string[]` para objeto porque o admin precisa do `id` para remover e reordenar.
- `tamanhos` vem na ordem PP, P, M, G, GG.
- Record Java: `ProdutoResposta(Long id, String nome, BigDecimal preco, String descricao, CategoriaProduto categoria,
  String categoriaNome, boolean ativo, boolean disponivel, OffsetDateTime criadoEm, List<TamanhoResposta> tamanhos,
  List<FotoResposta> fotos)`.

| # | Verbo e caminho | Papel | Entrada | Resposta | Erros |
|---|---|---|---|---|---|
| C1 | `GET /api/produtos` | público | query `categoria?` (enum), `nome?` (substring que ignora caixa e acento: `calca` acha `Calça`), `page=0`, `size=12`, `sort=criadoEm,desc` (permitidos `criadoEm`, `preco`, `nome`; desempate `id,desc`) | 200 `Page<ProdutoResposta>`: **só `ativo=true` com estoque**; filtros combinados com **E** | 400 categoria ou ordenação inválida |
| C2 | `GET /api/produtos/{id}` | público | — | 200 `ProdutoResposta` (mesmo esgotado). **Inativo só para ADMIN**; para os demais, 404 | 404 `Produto não encontrado` |
| C3 | `GET /api/produtos/categorias` | público | — | 200 `[{"valor":"CALCA","nome":"Calça"}, …]` (9, na ordem do enum) | — |
| C4 | `GET /api/produtos/admin` | ADMIN | `categoria?`, `nome?` (como em C1), `ativo?` (true/false), `disponivel?` (true/false), `page`, `size=20`, `sort=criadoEm,desc` | 200 `Page<ProdutoResposta>` com **todos** (inativos e esgotados), filtrados por **E**. "Sem estoque" = `ativo=true&disponivel=false` | 401, 403 |
| C5 | *(removido)* | — | — | O painel conta "sem estoque" com C4 `ativo=true&disponivel=false&size=1` e lê `totalElements`. D6 só pede esse contador | — |
| C6 | `POST /api/produtos` | ADMIN | `{"nome":"Blusa Linho","preco":89.90,"descricao":"…","categoria":"BLUSA","tamanhos":[{"sigla":"P","quantidade":3},{"sigla":"M","quantidade":5}]}` | 201 `ProdutoResposta` (`ativo=true`, sem fotos) | 400 (validações abaixo) |
| C7 | `PUT /api/produtos/{id}` | ADMIN | `{"nome"?,"preco"?,"descricao"?,"categoria"?,"ativo"?}`; `null` = não altera | 200 `ProdutoResposta` | 400, 404 |
| C8 | `PUT /api/produtos/{id}/estoque` | ADMIN | `{"tamanhos":[{"sigla":"M","quantidade":7},{"sigla":"GG","quantidade":2}]}` | 200 `ProdutoResposta`. **Upsert por sigla**: sigla existente tem a quantidade **definida** (valor absoluto); sigla nova cria a linha; sigla não enviada fica **intacta**. Nunca apaga linha e o id do tamanho não muda. Corrida com reservas aceita (R17) | 400, 404 |
| C9 | `DELETE /api/produtos/{id}` | ADMIN | — | 204. **Soft delete** (`ativo=false`), idempotente; reativar com C7 `{"ativo":true}`. Nunca 500 | 404 |
| C10 | `POST /api/produtos/{id}/fotos` | ADMIN | `multipart/form-data`, uma parte `arquivo` (um arquivo por requisição) | 201 `{"id":7,"url":"/storage/produtos/42/<uuid>.jpg","ordem":2}`; a `ordem` é a última + 1 | 400 `Envie o arquivo no campo 'arquivo'.`; 404; 413 `Arquivo maior que 5 MB.`; 415 `Formato não suportado. Envie JPEG, PNG ou WEBP.`; 422 `Limite de 6 fotos por produto.` |
| C11 | `DELETE /api/produtos/{id}/fotos/{fotoId}` | ADMIN | — | 204; apaga a linha e o objeto no MinIO e recompacta `ordem` 0..n-1 | 404 |
| C12 | `PUT /api/produtos/{id}/fotos/ordem` | ADMIN | `{"fotoIds":[9,7,8]}`: **exatamente** os ids das fotos do produto | 200 `[FotoResposta…]` na nova ordem (a primeira é a capa) | 400 `A lista deve conter todas as fotos do produto.`, 404 |

Validações (C6, C7, C8):
- `nome`: 1..120, obrigatório em C6.
- `preco`: `>= 0.01`, `@Digits(integer=15, fraction=2)`, obrigatório em C6.
- `descricao`: 1..2000, obrigatória em C6.
- `categoria`: obrigatória em C6.
- `tamanhos`: não vazio em C6 e C8; `quantidade` 0..9999.
- Sigla repetida → 400 `Tamanho repetido: M`. Sigla inválida → 400 `sigla deve ser PP, P, M, G ou GG`.

Upload (C10):
- O tipo é detectado pelos **bytes mágicos** (JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WEBP `RIFF….WEBP`),
  não pelo `Content-Type` do cliente.
- A extensão e o `Content-Type` gravados vêm do tipo detectado.
- Chave: `{produtoId}/{uuid-sem-hífens}.{jpg|png|webp}`.
- URL gravada: `${MINIO_PUBLIC_PREFIX}/${MINIO_BUCKET}/{chave}`.
- Limites: `spring.servlet.multipart.max-file-size=5MB` e `max-request-size=6MB`.
- `server.tomcat.max-swallow-size: 16MB`. O padrão (2 MB) faz o Tomcat fechar a conexão com corpo não lido, e o
  upload de 6 a 8 MB viraria reset ou 502 no lugar do 413 em pt-BR. Acima de 8 MB, o nginx responde 413 sozinho.

### 4.3 Sacola e pedidos (order-service)

Objetos:
```json
// CarrinhoResposta
{
  "itens": [
    {
      "id": 5,
      "produtoId": 42,
      "tamanhoId": 101,
      "sigla": "P",
      "quantidade": 2,
      "valorUnitario": 89.90,
      "valorTotal": 179.80,
      "nomeProduto": "Blusa Linho Areia",
      "fotoUrl": "/storage/produtos/42/3f1c….jpg"
    }
  ],
  "quantidadeItens": 2,
  "valorTotal": 179.80
}
// EnderecoEntrega (entrada e saída)
{
  "destinatario": "Maria Souza",
  "telefone": "85999990000",
  "cep": "60000-000",
  "rua": "Rua A",
  "numero": "10",
  "complemento": "Apto 101",
  "bairro": "Centro",
  "cidade": "Fortaleza",
  "uf": "CE"
}
// PedidoResposta
{
  "id": 17,
  "status": "PAGO",
  "subtotal": 179.80,
  "frete": 10.00,
  "valorTotal": 189.80,
  "motivoCancelamento": null,
  "sacolaRestaurada": false,
  "criadoEm": "2026-09-25T18:30:00Z",
  "expiraEm": null,
  "pagoEm": "2026-09-25T18:31:02Z",
  "enviadoEm": null,
  "recebidoEm": null,
  "canceladoEm": null,
  "cliente": { "nome": "Maria Souza", "email": "maria@exemplo.com" },
  "endereco": { "...": "EnderecoEntrega" },
  "itens": [
    {
      "id": 31,
      "produtoId": 42,
      "tamanhoId": 101,
      "sigla": "P",
      "quantidade": 2,
      "valorUnitario": 89.90,
      "valorTotal": 179.80,
      "nomeProduto": "Blusa Linho Areia",
      "fotoUrl": "/storage/produtos/42/3f1c….jpg"
    }
  ]
}
```
- `ItemResposta` (O2, O3) é um elemento de `CarrinhoResposta.itens`. Os itens do pedido têm o mesmo formato.
- Mudanças contra `b0752ed`: os itens ganham `nomeProduto` e `fotoUrl`, gravados como snapshot ao adicionar
  à sacola, o que resolve o N+1 do front. `enviado` e `recebido` saem dos itens.
- `expiraEm` = `criadoEm + PEDIDO_EXPIRACAO_MINUTOS` só quando `CRIADO`; `null` nos outros status.
- `sacolaRestaurada` = `true` só quando o cancelamento devolveu os itens à sacola (§6.3 item 10).
- `cliente.nome` é o snapshot do claim `name` (senão `preferred_username`, senão o e-mail). O nome da **conta** mora
  no Keycloak. `perfil.nome` (§4.5) é só o destinatário padrão da entrega.

Validação do `EnderecoEntrega`:
- `destinatario`: 1..200, obrigatório.
- `telefone`: opcional; se vier, 10–11 dígitos depois de tirar a máscara, e é gravado só com dígitos.
- `cep`: `\d{5}-?\d{3}`, gravado como `00000-000`.
- `rua`: 1..200. `numero`: 1..20. `complemento`: 0..100, opcional. `bairro`: 1..100. `cidade`: 1..100.
- `uf`: uma das 27 UFs; a entrada é convertida para maiúsculas.

| # | Verbo e caminho | Papel | Entrada | Resposta | Erros |
|---|---|---|---|---|---|
| O1 | `GET /api/carrinho` | auth | — | 200 `CarrinhoResposta` (vazia se não existe) | 401 |
| O2 | `POST /api/carrinho/itens` | auth | `{"produtoId":42,"sigla":"P","quantidade":1}` (`produtoId>0`, `quantidade` 1..99) | 201 `ItemResposta`. **Mescla** com a linha do mesmo tamanho, somando a quantidade. Os limites valem para a linha mesclada: (já na sacola + nova) ≤ estoque do tamanho, e ≤ 99. Preço, nome e foto vêm do catálogo no momento e atualizam a linha | 400; 404 `Produto não encontrado` (inexistente ou inativo); 422 `Este produto não tem o tamanho GG`; 422 `Quantidade pedida excede o estoque do tamanho P (restam N)`, com N = estoque − já na sacola (mínimo 0); 422 `Máximo de 99 unidades por item`; 503 `Catálogo indisponível, tente de novo em instantes` |
| O3 | `PUT /api/carrinho/itens/{itemId}` | auth (dono) | `{"quantidade":3}` (1..99) | 200 `ItemResposta` (confere o estoque no catálogo) | 404 `Item não está na sua sacola`; 422 estoque; 503 |
| O4 | `DELETE /api/carrinho/itens/{itemId}` | auth (dono) | — | 204 | 404 |
| O5 | `GET /api/pedidos/frete?uf=CE` | auth | `uf` | 200 `{"uf":"CE","valor":10.00}` | 400 `UF inválida` |
| O6 | `POST /api/pedidos` | auth | `{"endereco":EnderecoEntrega}` | 201 `PedidoResposta` em `CRIADO`, com `frete` calculado **no servidor** e `valorTotal = subtotal + frete` (é o valor cobrado). A sacola fica **travada** (`PESSIMISTIC_WRITE`) até o fim da transação: de dois O6 simultâneos, o segundo espera e encontra a sacola vazia (422). **Um pedido aguardando pagamento por cliente**: se ele já tem um pedido `CRIADO` → 409, nada é criado e a sacola fica intacta (sem o limite, uma conta repetiria o O6 a cada expiração e prenderia o estoque da loja). **Antes de criar**, lê cada produto da sacola no catálogo: produto ausente ou inativo (404 do catálogo), ou estoque do tamanho menor que a quantidade → 422 (o nome vem da linha da sacola) e **nada** é criado, e a sacola fica intacta. O preço, o nome e a foto dos itens do pedido vêm do catálogo nesse momento. Esvazia a sacola. A saga continua reservando o estoque, como garantia contra corrida | 400; 422 `Sua sacola está vazia` (conferido primeiro); 409 `Você já tem um pedido aguardando pagamento.`; 422 `Itens indisponíveis: Blusa Linho (M), Saia Midi (P)`; 422 `Sua conta está sem e-mail; entre novamente` (token sem `email`); 503 catálogo |
| O7 | `GET /api/pedidos` | auth | — | 200 `PedidoResposta[]` do próprio cliente, mais recente primeiro | 401 |
| O8 | `GET /api/pedidos/{id}` | dono ou ADMIN | — | 200 `PedidoResposta` | 404 `Pedido não encontrado` |
| O9 | `POST /api/pedidos/{id}/receber` | dono | — | 200 `PedidoResposta`: `ENVIADO → RECEBIDO` (`recebidoEm`); se já `RECEBIDO`, 200 sem mudança | 404; 409 `Pedido ainda não foi enviado` |
| O10 | `GET /api/pedidos/admin` | ADMIN | `status` (repetível; permitidos `PAGO`, `ENVIADO`, `RECEBIDO`; padrão `PAGO`), `page`, `size=20`, `sort=pagoEm,asc` (permitidos `pagoEm`, `enviadoEm`, `criadoEm`) | 200 `Page<PedidoResposta>` (com cliente, endereço e itens) | 400 `Status não permitido nesta lista`; 401; 403 |
| O11 | `POST /api/pedidos/{id}/enviar` | ADMIN | — | 200 `PedidoResposta`: `PAGO → ENVIADO` (`enviadoEm`), publica `order.order.shipped.v1`; se já `ENVIADO` ou `RECEBIDO`, 200 sem novo evento | 404; 409 `Só pedidos pagos podem ser enviados` |
| O12 | `GET /api/pedidos/admin/resumo` | ADMIN | — | 200 `{"porStatus":{"CRIADO":1,"PAGO":3,"ENVIADO":5,"RECEBIDO":12,"CANCELADO":2},"receitaMes":1523.40}`. Mês corrente no fuso `America/Fortaleza`, somando `valorTotal` dos pedidos com `pagoEm` no mês e status PAGO/ENVIADO/RECEBIDO. `porStatus` traz os 5 status, com 0 quando não há | 401, 403 |

Removidos: `GET /pedidos/historico`, `GET /pedidos/andamento`, `GET /pedidos/itens`, `POST /pedidos/itens/{id}/enviar`
e `POST /pedidos/itens/{id}/receber`.

Frete: `FRETE_POR_UF` (`CE=10.00`), senão `FRETE_PADRAO` (`40.00`).

### 4.4 Pagamentos (payment-service)

| # | Verbo e caminho | Papel | Entrada | Resposta | Erros |
|---|---|---|---|---|---|
| P1 | `GET /api/pagamentos/config` | **público** | — | 200 `{"habilitado":true,"publishableKey":"pk_test_…"}` ou `{"habilitado":false,"publishableKey":null}`. `habilitado` = `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` **e** `STRIPE_WEBHOOK_SECRET` não vazios | — |
| P2 | `GET /api/pagamentos/{pedidoId}/client-secret` | dono | — | 200 `{"clientSecret":"pi_…_secret_…","paymentIntentId":"pi_…"}` | 404 `Pagamento não encontrado` (inexistente ou de outro cliente); 404 `Cobrança ainda não criada, tente em instantes` (o front repete); 409 `Este pedido já foi pago`; 409 `Pagamento indisponível: pedido cancelado` (FALHOU, CANCELADO ou ESTORNADO); 503 `Pagamento ainda não configurado` |
| P3 | `POST /api/webhooks/stripe` | público (assinatura) | corpo cru + `Stripe-Signature: t=…,v1=…` | 200 (vazio) | 400 assinatura inválida ou expirada (tolerância de 300 s); 400 corpo que não é JSON (o `constructEvent` desserializa antes de verificar; nunca 500); 503 se `STRIPE_WEBHOOK_SECRET` estiver vazio (nunca aceitar sem segredo) |

O intent é criado com `payment_method_types=["card"]` (sem `automatic_payment_methods`): Pix e boleto são
assíncronos e não cabem na expiração de 30 min (§1).

### 4.5 Perfil (identity-service)

```json
// PerfilResposta
{
  "sub": "c0a8…",
  "email": "maria@exemplo.com",
  "nome": "Maria Souza",
  "cpf": "12345678909",
  "celular": "85999990000",
  "dataNascimento": "1995-04-12",
  "endereco": {
    "cep": "60000-000",
    "rua": "Rua A",
    "numero": "10",
    "complemento": null,
    "bairro": "Centro",
    "cidade": "Fortaleza",
    "uf": "CE"
  }
}
```
Mudanças contra `b0752ed`:
- `endereco.estado` vira **`uf`**, o mesmo nome do pedido, para evitar um mapeamento que gera bug. A coluna no banco continua `estado`.
- Entra `complemento`.
- Campos ausentes vêm como `null`.
- `nome` é o **destinatário padrão** da entrega, não o nome da conta. O nome da conta fica no Keycloak e é o que
  o pedido grava em `cliente.nome`.

| # | Verbo e caminho | Papel | Entrada | Resposta | Erros |
|---|---|---|---|---|---|
| I1 | `GET /api/perfil` | auth | — | 200 `PerfilResposta`. Cria no primeiro acesso a partir dos claims (`email`, `name`/`preferred_username`), sem corrida (insert `ON CONFLICT (sub) DO NOTHING`). Atualiza `email` se o token trouxer outro | 401 |
| I2 | `PUT /api/perfil` | auth | `{"nome"?,"cpf"?,"celular"?,"dataNascimento"?}`; `null` = mantém | 200 `PerfilResposta` (**upsert**: cria se não existir) | 400 `CPF inválido`; `Celular inválido (DDD + número)`; `Data de nascimento inválida` |
| I3 | `PUT /api/perfil/endereco` | auth | `{"cep"?,"rua"?,"numero"?,"complemento"?,"bairro"?,"cidade"?,"uf"?}`; `null` = mantém; `""` em `complemento` = limpa | 200 `PerfilResposta` (upsert) | 400 |
| I4 | `GET /api/perfil/{sub}` | ADMIN | — | 200 `PerfilResposta` | 404 |

Validação:
- `cpf`: aceita `\d{11}` ou `000.000.000-00`, confere os **dígitos verificadores** e grava só os dígitos.
- `celular`: 10–11 dígitos depois de tirar a máscara, gravado só com dígitos.
- `dataNascimento`: passado e `>= 1900-01-01`.
- `nome`: 1..200.
- Endereço: como em §4.3, com todos os campos opcionais.

### 4.6 Rotas públicas no gateway (todo o resto exige JWT)
- `GET /api/produtos/**`. O catalog protege `/produtos/admin/**` com `@PreAuthorize`.
- `GET /api/pagamentos/config`
- `POST /api/webhooks/stripe`
- `/actuator/health/**` (só na rede interna; o nginx não encaminha)

---

## 5. Eventos Kafka

O envelope não muda: `EventEnvelope{eventId, type, aggregateId, occurredAt, version, payload(JSON string)}`.
- Chave = id do pedido.
- Dinheiro em centavos (`long`).
- Os campos novos são **aditivos** em `.v1`. Não existe consumidor fora deste repositório, e o `ObjectMapper` do
  Boot ignora campos desconhecidos, então o tópico não é versionado de novo.
- Records novos em `common/event/Events.java`:
  - `EnderecoEntrega(String destinatario, String telefone, String cep, String rua, String numero, String complemento, String bairro, String cidade, String uf)`
  - `ItemResumo(String nomeProduto, String sigla, int quantidade, long valorTotalCentavos)`

| Tópico | Payload | Produtor | Consumidores |
|---|---|---|---|
| `order.order.created.v1` | `OrderCreated(orderId, clienteSub, clienteEmail, valorTotalCentavos /*inclui frete*/, itens[Item(produtoId,tamanhoId,sigla,quantidade,valorUnitarioCentavos)])`, sem mudança | order | catalog (reserva), payment (cria o intent) |
| `order.order.paid.v1` | `OrderPaid(orderId, clienteSub, clienteEmail, clienteNome, valorTotalCentavos, freteCentavos, itens[ItemResumo], endereco)`: **+clienteNome, freteCentavos, itens, endereco** | order | notification |
| `order.order.cancelled.v1` | `OrderCancelled(orderId, clienteSub, clienteEmail, clienteNome, motivo, sacolaRestaurada)`: **+clienteNome, +sacolaRestaurada**; o `motivo` vem em pt-BR | order | catalog (devolve estoque), notification, **payment (NOVO: cancela o intent ou estorna; único caminho de estorno)** |
| `order.order.shipped.v1` **NOVO** | `OrderShipped(orderId, clienteSub, clienteEmail, clienteNome, itens[ItemResumo], endereco)` | order (O11) | notification |
| ~~`order.order.refund-requested.v1`~~ | **Removido**: `Events.RefundRequested` e `Topics.ORDER_REFUND_REQUESTED` saem do common, o order para de publicar e o payment tira o listener. O estorno vem de `order.cancelled` | — | — |
| `catalog.stock.reserved.v1` | `StockReserved(orderId, itens)`, sem mudança | catalog | order |
| `catalog.stock.rejected.v1` | `StockRejected(orderId, motivo)`. O `motivo` passa a ser legível: `Sem estoque: Blusa Linho (M), Saia Midi (P)` ou `Produto indisponível: <nome>` | catalog | order |
| `payment.payment.succeeded.v1` | `PaymentSucceeded(orderId, paymentIntentId, chargeId, valorCentavos)`, sem mudança | payment | order |
| `payment.payment.failed.v1` | `PaymentFailed(orderId, paymentIntentId, motivo)`, com `motivo` fixo em pt-BR: `Pagamento recusado` (falha na criação, webhook `payment_failed` e reconciliação) ou `Pagamento ainda não configurado na loja`. O texto da Stripe **nunca** entra no motivo | payment | order |
| `payment.payment.refunded.v1` | sem mudança | payment | nenhum (aceito) |
| `<tópico>.dlq` | registro original | error handler | nenhum (aceito) |

**Retentativa e DLQ** (`KafkaErrorHandlerConfig`, no common):
- padrão: backoff exponencial (500 ms, ×2) por até 30 s; esgotado → `<tópico>.dlq`;
- **compensações** (`uzusis.kafka.compensacoes`: `order.order.cancelled.v1` no catalog e no payment): retentativa
  **sem limite**, com backoff exponencial até 60 s entre tentativas e um ERROR a cada uma. A DLQ não tem consumidor, e
  um `order.cancelled` descartado por falha passageira deixaria o cliente cobrado sem estorno e a peça presa numa
  reserva. O teto de 60 s fica abaixo do `max.poll.interval.ms` (5 min), porque a espera roda na thread do consumidor.
  Custo aceito: um bug determinístico nesse consumidor trava a partição até ser corrigido (dinheiro parado e
  barulhento em vez de sumido; sem alerta, §1);
- evento **ilegível** (`LeitorDeEvento.EventoIlegivelException`) vai direto para a DLQ, também nas compensações (a
  classificação vem antes do backoff);
- o notification fica no padrão de propósito: uma falha permanente de SMTP travaria a partição para sempre. Os outros
  eventos da saga também: a perda deles já é compensada pela expiração (→ `order.cancelled`).

`Topics.ORDER_SHIPPED = "order.order.shipped.v1"`. O Debezium roteia pela coluna `topic`, então não precisa mudar
conector; o Kafka cria o tópico sozinho.

Motivos de cancelamento, fixos e em pt-BR:
- estoque: o do `StockRejected`
- pagamento: o do `PaymentFailed`
- expiração: `Pagamento não concluído em {N} minutos`

---

## 6. Mudanças por módulo de backend

Regras comuns:
- Os testes de integração usam Testcontainers `postgres:16-alpine` com `@ServiceConnection`.
- **Todo teste termina em `Test`**: não há failsafe, e o sufixo `IT` não roda no `mvn verify`. Os testes com banco
  levam o sufixo `BancoTest`.
- Em teste: `spring.kafka.listener.auto-startup=false`. No catalog e no order ele fica em
  `src/test/resources/config/application.yml`, que se soma ao yml principal: um `application.yml` na raiz do
  classpath de teste esconderia o de `src/main` inteiro.
- Serviços servlet (catalog, order, payment, identity, notification): `spring.web.locale: pt_BR` e
  `spring.web.locale-resolver: fixed` no `application.yml`, e toda constraint com `message` pt-BR (§4.0).
- **Sem springdoc**: sai a dependência `springdoc-openapi-starter-webmvc-ui` dos poms de catalog, order, payment e
  identity, e o `permitAll` de `/v3/api-docs/**` e `/swagger-ui/**` dos `SecurityConfig`.
- Todo serviço ganha `XxxApplicationContextTest` (`@SpringBootTest`) que sobe o contexto inteiro. No
  catalog/order/payment/identity ele também afirma:
  - `select count(*) from flyway_schema_history where version = '0'` = 1;
  - a tabela `outbox` existe.
- **Flyway**: `spring.flyway.locations: classpath:db/migration` em catalog, order, payment e identity (os testes
  do catalog usam o yml principal). A varredura recursiva pega `db/migration/common/V0` do jar
  `common`. O notification continua com `classpath:db/migration/common`.
  Os relatórios discordam se as duas locations quebram. O teste acima decide; a location única é correta nos dois casos.
- **Resource server** (gateway, catalog, order, payment, identity):
  ```yaml
  spring.security.oauth2.resourceserver.jwt:
    issuer-uri: ${KEYCLOAK_ISSUER:http://localhost:8080/auth/realms/uzusis}
    jwk-set-uri: ${KEYCLOAK_JWKS_URI:http://localhost:8080/auth/realms/uzusis/protocol/openid-connect/certs}
  ```
- `management.tracing.enabled: ${MANAGEMENT_TRACING_ENABLED:false}`.
- Os `@PreAuthorize("hasRole('ADMIN')")` ficam como estão.

### 6.1 `uzusis-api/pom.xml` (pai) e `common` — dono (c)
Mudanças:
1. `testcontainers.version` → **1.21.4**. Corrigir o comentário.
   No `<pluginManagement>` do pai, o `maven-surefire-plugin` recebe
   `<environmentVariables><DOCKER_HOST>unix:///var/run/docker.sock</DOCKER_HOST></environmentVariables>`. A estratégia
   vinda do ambiente não é persistida, então nada é gravado em `~/.testcontainers.properties`.
2. `common/web/TratadorDeErros` (novo): `@RestControllerAdvice extends ResponseEntityExceptionHandler`, com a tabela
   de §4.0.
   - Sobrescrever `handleExceptionInternal` para pôr `detail` em pt-BR nas exceções do Spring MVC.
   - Validação produz `erros[{campo,mensagem}]`.
   - **Relança** `AccessDeniedException` e `AuthenticationException` (§4.0), declarado antes do handler genérico.
   - Dependências `spring-webmvc` e `jakarta.validation-api` com `<optional>true</optional>`. O Spring Security já
     vem do `spring-boot-starter-oauth2-resource-server` do common. O gateway (WebFlux) não depende do common.
3. `KeycloakRoleConverter`: **só `realm_access.roles`**. Remover o achatamento de `resource_access`: hoje um papel
   de client chamado `ADMIN`, em qualquer client, vira `ROLE_ADMIN`.
4. `Events` e `Topics` como em §5: novos records e campos, `ORDER_SHIPPED`, e a remoção de `RefundRequested` e de
   `ORDER_REFUND_REQUESTED`. O order e o payment deixam de compilar até os donos (c) e (d) tirarem o uso, o que é
   parte da fase 2 deles.
5. `KafkaErrorHandlerConfig`: `addNotRetryableExceptions(LeitorDeEvento.EventoIlegivelException.class)` e
   `setBackOffFunction` com a retentativa sem limite para os tópicos de `uzusis.kafka.compensacoes` (§5).
6. `common/security/SoAccessToken` (novo): bean `OAuth2TokenValidator<Jwt>` = `JwtClaimValidator("typ", "Bearer"::equals)`.
   O Boot soma todo bean desse tipo ao validador de iss/exp do `JwtDecoder` que monta com `issuer-uri` + `jwk-set-uri`,
   então nenhum yml de JWT muda e não há discovery na URL pública. Os 4 resource servers servlet o pegam pelo scan
   de `br.ifce.uzusis`; o gateway declara o mesmo bean (§6.7).

Aceite:
- `mvn -f uzusis-api/pom.xml -B -N install && mvn -f uzusis-api/pom.xml -B -pl common install` passa.
  É o **primeiro** passo da fase 1, porque os outros módulos dependem disso.

Testes:
- `KeycloakRoleConverterTest`: papel de client `ADMIN` não gera `ROLE_ADMIN`; papel de realm gera.
- `TratadorDeErrosTest` (MockMvc standalone, com um controller de teste):
  - `@Valid` → 400 com `erros`;
  - RSE 422 → `detail` = reason;
  - exceção genérica → 500 sem stack;
  - controller que lança `AccessDeniedException` → a exceção **sai** do MockMvc (não vira 500).
- `KafkaErrorHandlerConfigTest`: tópico comum vai para a DLQ na 7ª entrega; a compensação não vai em 20 entregas;
  evento ilegível vai direto.
- `MoneyTest` continua passando.

### 6.2 catalog-service — dono (b)
Mudanças:
1. Migração `V2__ativo_fotos.sql`:
   - `produto.ativo BOOLEAN NOT NULL DEFAULT TRUE`;
   - `foto.ordem INTEGER NOT NULL DEFAULT 0`;
   - `foto.chave VARCHAR(300)`;
   - índices `produto(ativo, criado_em DESC)` e `produto(categoria)`;
   - `CREATE EXTENSION IF NOT EXISTS unaccent` (extensão *trusted*: o usuário `catalog`, dono do database, pode criar);
   - `CREATE TABLE pedido_cancelado (order_id BIGINT PRIMARY KEY)` (corrida R8, item 7).
2. `CategoriaProduto` ganha `nomeExibicao` (tabela §4.1). Tamanhos PP–GG, ordenados por uma ordem fixa no DTO.
3. C1 e C4 com `JpaSpecificationExecutor<Produto>`: filtros opcionais combinados por E, e para a vitrine
   `ativo = true` e `exists(tamanho com quantidade > 0)`. `disponivel` (C4) usa o mesmo `exists`, ou a negação dele.
   O filtro `nome` compara `lower(unaccent(nome))` com `lower(unaccent(:q))` via `cb.function("unaccent", …)`, com
   `%` e `_` do termo escapados (o `lower` vem depois: com `LC_CTYPE=C` o `lower` do Postgres só mexe em ASCII, e
   `Í` ficaria maiúsculo). **Não** usar `:param is null` em JPQL: o Postgres não
   infere o tipo de um parâmetro nulo. Ordenação por whitelist; campo fora dela → 400 `Ordenação inválida`.
4. C2: um inativo só é visível para quem tem `ROLE_ADMIN`. O `Authentication` pode ser anônimo, porque a rota é pública.
5. C3, C7 (com `ativo`), C8 (upsert sem apagar linha), C9 (soft delete). C5 não existe.
6. Fotos (C10–C12):
   - dependência `io.minio:minio:8.5.17`;
   - bean `MinioClient` com `MINIO_*`;
   - upload: 1) valida bytes, tamanho e quantidade; 2) `putObject` com o content-type detectado; 3) grava a linha.
     Se o insert falhar, remove o objeto.
   - remoção: apaga a linha e depois o objeto (falha no MinIO só vai para o log).
   - **Não** cria bucket; o `minio-init` cria.
7. `EstoqueService`:
   - `reservar` rejeita tamanho de produto **inativo** (`Produto indisponível: <nome>`);
   - a mensagem de falta usa nome e sigla (`Sem estoque: Blusa Linho (M)`);
   - **corrida R8** (`order.cancelled` processado antes de `order.created`, porque os tópicos são diferentes):
     `devolver` sempre grava `pedido_cancelado(order_id)` (`ON CONFLICT DO NOTHING`), mesmo sem reserva;
     `reservar` de um `order_id` que está em `pedido_cancelado` só loga e não baixa nem publica nada.
     Os dois começam com `pg_advisory_xact_lock(orderId)`: sem ele, dois eventos processados ao mesmo tempo não
     veriam a escrita um do outro, e o estoque vazaria.
8. `ProdutoService.excluir` deixa de apagar (resolve o 500 por FK de `reserva_estoque`).
9. yml:
   - `spring.data.web.pageable.serialization-mode: direct`
   - `max-page-size: 100`
   - multipart 5MB/6MB e `server.tomcat.max-swallow-size: 16MB` (§4.2)
   - `uzusis.minio.*`
   - locale fixo pt-BR (§6, regras comuns)

Aceite:
- `GET /produtos` nunca mostra inativo nem esgotado.
- `?categoria=BLUSA&nome=linho&sort=preco,asc` combina os filtros; `nome=calca` acha "Calça".
- C4 `ativo=true&disponivel=false` lista só os ativos esgotados.
- `DELETE` seguido de `GET` anônimo → 404, e `GET` com ADMIN → 200 `ativo:false`.
- C8 com `{M:7}` num produto `{P:3, M:1}` → `{P:3, M:7}`, com os mesmos ids.
- Upload de `.txt` renomeado para `.png` → 415.
- A 7ª foto → 422.

Testes:
- context-load;
- `ProdutoServiceBancoTest` (`@DataJpaTest` + Testcontainers): vitrine esconde inativo e esgotado, filtros combinados,
  busca sem acento, `disponivel`, ordenação por preço, estoque sem recriar linhas;
- `EstoqueServiceTest` atual, que precisa **passar** agora, mais dois casos: produto inativo é rejeitado; `devolver`
  antes de `reservar` faz o `reservar` seguinte não baixar nada;
- `FotoServiceTest` (unitário, `MinioClient` mockado): tipos aceitos e recusados pelos bytes, limite de 6,
  remoção recompacta a ordem;
- `ProdutoControllerSecurityTest` (`@SpringBootTest` + `@AutoConfigureMockMvc` + `spring-security-test` `jwt()`, com o
  Postgres do Testcontainers. `@WebMvcTest` não serve, porque o `@EnableJpaRepositories` da classe principal exige
  JPA, e o teste precisa do yml e do `SecurityConfig` reais): anônimo em `GET /produtos/admin` → **401**
  (não 500); CUSTOMER em `POST /produtos` → **403** (não 500); ADMIN em `POST /produtos` com `nome` vazio e sem
  `Accept-Language` → 400 com `detail` em pt-BR.

### 6.3 order-service — dono (c)
Mudanças:
1. **Remover o client OAuth2**:
   - dependência `spring-boot-starter-oauth2-client`;
   - `authorizedClientManager` e o interceptor de `RestClientConfig`;
   - `spring.security.oauth2.client.*` do yml.
   O `RestClient` fica simples, com `baseUrl`, connect timeout de 2 s e read timeout de 5 s.
   `CatalogoIndisponivelException` → **503** com o `detail` de §4.3.
2. `ProdutoResumo` passa a ser `(Long id, String nome, BigDecimal preco, List<Tamanho> tamanhos, List<Foto> fotos)`,
   com `Tamanho(Long id, String sigla, int quantidade)` e `Foto(String url)`. Sem `ativo`: a chamada é anônima, e o
   catálogo já responde 404 para produto inativo (C2), que o order trata como "produto indisponível".
3. Migração `V2__pedido_status_endereco.sql`:
   - `pedido`: `subtotal`, `frete` (NUMERIC(19,4) NOT NULL DEFAULT 0), `cliente_nome VARCHAR(200)`,
     `entrega_destinatario`, `entrega_telefone`, `entrega_cep`, `entrega_rua`, `entrega_numero`,
     `entrega_complemento`, `entrega_bairro`, `entrega_cidade`, `entrega_uf`, `pago_em`, `enviado_em`,
     `recebido_em` e `cancelado_em` (TIMESTAMPTZ), `sacola_restaurada BOOLEAN NOT NULL DEFAULT FALSE`;
   - `item_pedido` e `item_carrinho`: `nome_produto VARCHAR(120)`, `foto_url VARCHAR(500)`;
   - `DROP` de `item_pedido.enviado`, `item_pedido.recebido` e do índice `idx_item_pedido_enviado`;
   - índice `pedido(status, pago_em)`.
4. `StatusPedido` += `ENVIADO`, `RECEBIDO`. `Pedido.avaliar()` fica igual (qualquer status ≠ CRIADO → PENDENTE),
   mas `Desfecho.CANCELAR_COM_ESTORNO` **some**: todo cancelamento é `CANCELAR`, e o estorno vem do payment ao
   consumir `order.cancelled`. `pagar()` preenche `pagoEm`; `cancelar()` preenche `canceladoEm`. O motivo é
   truncado em 500 caracteres ao gravar (a coluna é `VARCHAR(500)`; um `StockRejected` com muitos itens viraria
   mensagem envenenada).
5. Sacola:
   - O2 mescla por `tamanhoId`, com o limite de estoque e de 99 na linha mesclada (§4.3); O3 é novo; nome, foto e
     preço viram snapshot;
   - criação do carrinho sem corrida (`insert … on conflict (cliente_sub) do nothing` + select `PESSIMISTIC_WRITE`).
     A sacola fica travada até o fim da transação em O2, O6 e na restauração: duas abas adicionando o mesmo
     tamanho não criam duas linhas (que o O6, conferindo linha a linha, deixaria passar acima do estoque);
   - sigla PP–GG.
6. O6: body com `endereco` validado. Trava a sacola; se o cliente já tem pedido `CRIADO`
   (`existsByClienteSubAndStatus`) → 409 `Você já tem um pedido aguardando pagamento.` sem mexer na sacola. **Revalida** cada linha da sacola com o `CatalogoClient` (§4.3): ausente ou
   inativo (404) ou estoque insuficiente → 422 `Itens indisponíveis: <nome> (<sigla>), …`, sem criar nada e sem
   mexer na sacola. Preço, nome e foto do item do pedido vêm dessa leitura. `FreteService` lê
   `uzusis.frete.padrao: ${FRETE_PADRAO:40.00}` e `uzusis.frete.por-uf: ${FRETE_POR_UF:CE=10.00}`. O `valorTotal`
   inclui o frete e vai para `OrderCreated.valorTotalCentavos`. `cliente_nome` sai dos claims.
7. O5, O7–O12. Remover os endpoints por item (§4.3).
8. `OrderPaid`, `OrderCancelled` e `OrderShipped` com os campos de §5. Não publica mais `RefundRequested`.
9. **Expiração**:
   - `@EnableScheduling` no `OrderApplication` (em `b0752ed` não tinha, e o job ficaria mudo);
   - `@Scheduled(fixedDelayString="${uzusis.pedido.varredura-ms:60000}")`;
   - busca `CRIADO` com `criadoEm < agora - ${PEDIDO_EXPIRACAO_MINUTOS:30} min`;
   - para cada id, numa **transação própria** com `travarPorId`, confere de novo `CRIADO` e cancela com
     `Pagamento não concluído em N minutos`;
   - publica `order.cancelled` (se já estava pago, o payment estorna).
10. **Sacola restaurada**: ao cancelar com `estoqueReservado != FALSE` (pagamento recusado ou expiração), os itens
    voltam à sacola do cliente, mesclando por tamanho, com o preço, nome e foto do pedido, e o pedido grava
    `sacola_restaurada = true` na mesma transação. O valor vai em `PedidoResposta.sacolaRestaurada` e em
    `OrderCancelled.sacolaRestaurada`. A rejeição de estoque não restaura (`false`).
11. `PaymentSucceeded` para um pedido que já não está `CRIADO`: só log. Quem estorna é o payment (§6.4).
12. yml: `serialization-mode: direct`, `uzusis.pedido.*`, `uzusis.frete.*`, `uzusis.fuso: America/Fortaleza`, locale fixo.

Aceite:
- O serviço sobe sem o Keycloak no ar.
- `POST /pedidos` com UF `CE` e subtotal 179,80 → `frete 10.00`, `valorTotal 189.80`, e o evento com `18980` centavos.
- Preço alterado no catálogo depois de pôr na sacola → o pedido usa o preço novo.
- Item esgotado ou desativado na sacola → O6 dá 422 com o nome e a sigla, e a sacola continua igual.
- Outro cliente em `GET /pedidos/{id}` → 404.
- `enviar` de pedido `CRIADO` → 409.
- Pedido `CRIADO` vencido → `CANCELADO`, com a sacola restaurada, `sacolaRestaurada: true` e `order.cancelled` no outbox.

Testes:
- context-load, que também afirma que o `ScheduledTaskHolder` tem pelo menos uma tarefa (pega a falta de `@EnableScheduling`);
- `PedidoSagaTest` atualizado (sem `CANCELAR_COM_ESTORNO`);
- `FreteServiceTest`;
- `PedidoServiceBancoTest` (Testcontainers, `CatalogoClient` mockado):
  - criar pedido com endereço e frete;
  - revalidação no O6: preço novo, item inativo e item sem estoque;
  - O2 com mescla acima do estoque e acima de 99;
  - enviar/receber com transições válidas e inválidas;
  - expiração com `Clock` injetável;
  - restauração da sacola (e a flag) em recusa, e não em rejeição de estoque;
  - outbox com os tópicos certos, sem `refund-requested`;
- `PedidoControllerSecurityTest` (`@SpringBootTest` + `@AutoConfigureMockMvc` + `jwt()`): IDOR → 404, CUSTOMER em
  `/pedidos/admin` → 403 (não 500), anônimo em `/pedidos` → 401.

### 6.4 payment-service — dono (d)
Mudanças:
1. `StripeConfig`: `StripeClient.builder().setApiKey(secretKey)` e, se `STRIPE_API_BASE` não estiver vazio,
   `.setApiBase(...)`. Props: `uzusis.stripe.publishable-key: ${STRIPE_PUBLISHABLE_KEY:}` e
   `api-base: ${STRIPE_API_BASE:}`. Bean `ConfiguracaoStripe.habilitado()`. No boot, se estiver desabilitado:
   `WARN Stripe não configurado (STRIPE_SECRET_KEY/STRIPE_PUBLISHABLE_KEY/STRIPE_WEBHOOK_SECRET): pagamentos desabilitados`.
2. P1 (público no `SecurityConfig`: `GET /pagamentos/config`); P2 com os códigos de §4.4, incluindo `paymentIntentId`.
3. `criarIntent`:
   - se `!habilitado`: `Pagamento` FALHOU + `PaymentFailed("Pagamento ainda não configurado na loja")`;
   - se já existe um `Pagamento` **CANCELADO** para o pedido: não faz nada;
   - `payment_method_types=["card"]` (§4.4), sem `automatic_payment_methods`;
   - chave de idempotência: `order-{orderId}-{pagamento.criadoEm.toEpochSecond()}`, para não colidir depois de um reset
     do banco (a Stripe guarda a chave por 24 h). As três chaves (create, cancel e refund) levam o mesmo sufixo;
   - falha na Stripe → `motivo = "Pagamento recusado"`, com o detalhe no log.
4. `StatusPagamento` += `CANCELADO` (VARCHAR(20), sem migração).
5. **Novo consumidor `order.order.cancelled.v1`** → `cancelarPorPedido(orderId)`, com lock por pedido. É o **único**
   caminho de estorno: o listener de `order.order.refund-requested.v1` sai, e `estornar` passa a receber o `Pagamento`.
   | Estado local | Ação |
   |---|---|
   | sem `Pagamento` | cria um `Pagamento` com status `CANCELADO` e valor 0, para que um `order.created` atrasado não crie intent |
   | `CRIADO` ou `FALHOU` com intent | `paymentIntents().cancel(id)`, chave `cancel-order-{orderId}-{criadoEm}` → `CANCELADO`. Se a Stripe responder que o intent já foi pago (`payment_intent_unexpected_state` e `retrieve().status == succeeded`), estorna como no caso `CONFIRMADO` |
   | `CRIADO` ou `FALHOU` sem intent | → `CANCELADO` |
   | `CONFIRMADO` | estorna (`refund-order-{orderId}-{criadoEm}`) → `ESTORNADO` + `PAYMENT_REFUNDED`. Se o estorno falhar na Stripe: log de erro e `CANCELADO` local, e a reconciliação noturna tenta de novo |
   | `CANCELADO` ou `ESTORNADO` | nada |
   | qualquer outro erro da Stripe no cancel (estado inesperado, rede) | log de erro e `CANCELADO` local. A reconciliação noturna estorna se o intent aparecer `succeeded`. **Nunca** relançar: com a retentativa sem limite do `order.cancelled` (§5), isso travaria a partição |

   `{criadoEm}` = `pagamento.criadoEm.toEpochSecond()`, como na chave do create.
6. `confirmarPeloWebhook` num `Pagamento` **FALHOU ou CANCELADO** (o pedido já foi ou vai ser cancelado, e o cliente
   pagou mesmo assim): **estorna na hora** → `ESTORNADO`, e **não** publica `PAYMENT_SUCCEEDED`. `estornar` continua
   idempotente (só age em `CONFIRMADO`, ou no caso deste item).
7. **B6**: `ProcessadorDeWebhook` com `TransactionTemplate`:
   - busca os ids pendentes;
   - processa cada um em uma transação (recarrega por id, aplica, `marcarProcessado`);
   - se der erro, grava o erro numa segunda transação.
   Webhook de intent **desconhecido**: WARN e marca processado. O stripe-cli encaminha eventos de outros pagamentos
   da conta; sem isso, eles seriam reprocessados para sempre.
   `falharPeloWebhook` publica sempre `PaymentFailed(..., "Pagamento recusado")`. O `last_payment_error.message` da
   Stripe (em inglês ou no idioma do cartão) vai só para o log e para `motivo_falha`.
8. `StripeWebhookController`: segredo vazio → 503 sem ler o corpo. Qualquer exceção do `Webhook.constructEvent`
   (assinatura inválida **ou** `JsonSyntaxException` de corpo malformado) → 400, nunca 500.
9. `ReconciliacaoJob`, em dois métodos:
   - remover o `@Transactional`: cada chamada ao serviço já é transacional;
   - os dois retornam na hora se `!habilitado`;
   - **pendentes**: `@Scheduled(fixedDelayString="${uzusis.stripe.reconciliar-ms:120000}")` para `CRIADO` com intent
     e `criadoEm` de mais de 2 min: `retrieve`; `succeeded` → confirma; `canceled` → `falharPeloWebhook` com
     `Pagamento recusado`. Cobre o webhook perdido (stripe-cli parado, endpoint não cadastrado) muito antes da
     expiração de 30 min, que senão viraria estorno;
   - **noturno** (`cron 0 0 3 * * *`): `FALHOU` e `CANCELADO` com `succeeded` na Stripe → estornar.

Aceite:
- Sem chaves, o boot funciona, P1 dá `habilitado:false` e P2 dá 503.
- Com o override e2e, o intent é criado no stripe-mock, só com `card`.
- Um webhook `succeeded` assinado deixa `CONFIRMADO` e publica `PaymentSucceeded`.
- `order.cancelled` de um pedido `CONFIRMADO` estorna.
- Webhook `succeeded` de um pagamento `FALHOU` ou `CANCELADO` → `ESTORNADO`, sem `PaymentSucceeded`.

Testes:
- context-load;
- `ProcessadorDeWebhookBancoTest` (Testcontainers): um `WebhookRecebido` de tipo ignorado fica `processado=true` depois de
  `processarPendentes()` (regressão B6); intent desconhecido fica processado; `payment_failed` com
  `last_payment_error.message` em inglês publica `Pagamento recusado`;
- `PagamentoServiceTest` (Mockito para `StripeClient` e serviços): cada linha da tabela do item 5, e o item 6;
- `ReconciliacaoJobTest` (Mockito): `CRIADO` com `succeeded` confirma; com `requires_payment_method` não faz nada;
- `StripeWebhookControllerTest` atual + segredo vazio → 503 + corpo que não é JSON → 400;
- `PagamentoControllerSecurityTest` (`@SpringBootTest` + `@AutoConfigureMockMvc` + `jwt()`): P2 de pedido de outro
  cliente → 404 (IDOR); P1 anônimo → 200.

### 6.5 identity-service — dono (e)
Mudanças:
1. Migração `V2__complemento.sql`:
   - `ADD complemento VARCHAR(100)`;
   - `DROP INDEX idx_perfil_email` e `CREATE INDEX idx_perfil_email ON perfil(email)` (não único: o dono do
     e-mail é o Keycloak, e uma cópia antiga não pode dar 500).
2. I1 sem corrida (upsert nativo) e com atualização do e-mail; I2 e I3 com **upsert**; `uf` e `complemento`;
   validações de §4.5, com `CpfValidator` para os dígitos verificadores; normalização para só dígitos.

Aceite:
- `PUT /perfil` antes de qualquer `GET` → 200.
- CPF `123.456.789-09` gravado como `12345678909`.
- CPF `111.111.111-11` → 400.
- `uf` `ce` → `CE`.

Testes: context-load; `CpfValidatorTest`; `PerfilServiceBancoTest` (upsert, e-mail atualizado, primeiro GET concorrente sem 500).

### 6.6 notification-service — dono (e)
Mudanças:
1. `EmailService` com `MimeMessageHelper` (multipart: HTML + texto). Templates em text blocks Java com
   `String.formatted`. Todo valor dinâmico passa por `HtmlUtils.htmlEscape`. Nada de Thymeleaf.
2. Três e-mails:

   | Evento | Assunto (o e2e procura `#<id>` e a palavra) |
   |---|---|
   | `order.paid` | `Pedido #17 confirmado — Uzusis` |
   | `order.cancelled` | `Pedido #17 cancelado — Uzusis` |
   | `order.shipped` (listener novo) | `Pedido #17 enviado — Uzusis` |

   Layout comum aos três:
   - largura de 600px, tabelas e CSS inline;
   - cabeçalho "UZUSIS" em serif (`Georgia`) com cor `#7a5a41` e fundo `#faf8f5`;
   - "Olá, {primeiro nome}!" (ou "Olá!" se não houver nome);
   - botão "Ver meus pedidos" → `${PUBLIC_URL}/conta/pedidos`;
   - rodapé "Uzusis — feita de irmãs para as nossas Sis."

   Corpo de cada um, **só com o que o evento traz** (§5):
   - **Pago** (`OrderPaid`): tabela de itens (nome, tamanho, quantidade, valor), subtotal (= total − frete), frete e
     total em `R$` pt-BR, e o endereço de entrega. É o único com valores.
   - **Enviado** (`OrderShipped`): itens (nome, tamanho, quantidade, **sem** valores), o endereço e "confirme o
     recebimento em Minha conta".
   - **Cancelado** (`OrderCancelled`): o motivo; "Se algum valor foi cobrado, o estorno já foi solicitado e aparece
     na fatura em alguns dias"; e, só quando `sacolaRestaurada`, "Os itens voltaram para a sua sacola". Sem itens,
     sem endereço, sem valores.
3. `SecurityConfig` mínimo: `/actuator/health/**` permitido, o resto `denyAll`, sem formulário e sem basic.
4. yml: `uzusis.loja-url: ${PUBLIC_URL:http://localhost:8080}` e `EMAIL_FROM`; timeouts do JavaMail (5 s/10 s/10 s,
   senão um SMTP ruim prende o consumidor Kafka); `management.health.mail.enabled: false` (o healthcheck a cada 10 s
   faria connect + AUTH no SMTP real).

Aceite: com o stack no ar, o e2e encontra os três e-mails no Mailpit.

Testes:
- context-load;
- `EmailTemplatesTest`: o HTML contém o nome **escapado** (`<script>` → `&lt;script&gt;`), o total formatado
  (`R$ 189,80`, no de pago) e o link `/conta/pedidos`; o de cancelado não tem valores e só traz "Os itens voltaram
  para a sua sacola" com `sacolaRestaurada = true`.

### 6.7 gateway — dono (a)
Mudanças:
1. Remover a rota `legado-dotnet`.
2. Rotas de §2.2 com `StripPrefix=1`.
3. `jwk-set-uri`.
4. `SecurityConfig` com as rotas públicas de §4.6. Sem CORS: é a mesma origem. O gateway não depende do common,
   então declara o próprio bean `typ = Bearer` (§6.1 item 6).
5. **Cache de DNS limitado a 5 s**: bean `HttpClientCustomizer` no `GatewayApplication`
   (`http.resolver(dns -> dns.cacheMaxTimeToLive(Duration.ofSeconds(5)))`). O DNS do Docker responde com TTL de
   600 s e o Reactor Netty guardaria o IP esse tempo todo: um serviço recriado com outro IP (o override do e2e, um
   `up -d` depois de mudar o `.env`) daria 500 "Connection refused" por até 10 min.

Testes: `GatewaySecurityTest` (`@SpringBootTest(webEnvironment=RANDOM_PORT)` + `WebTestClient`):
- `GET /api/pedidos` anônimo → 401;
- `GET /api/produtos`, `GET /api/pagamentos/config` e `POST /api/webhooks/stripe` anônimos → **não** 401
  (502/503 serve, porque não há backend; os backends apontam para `127.0.0.1:10`, porque o Reactor Netty só aceita
  porta de 2 a 5 dígitos);
- `GET /api/qualquer-coisa` → 401 ou 404, nunca roteado;
- `idTokenDoKeycloakNaoValeComoAccessToken` e `ipDosServicosNaoFicaPresoNoCacheDeDns`.

---

## 7. Front (`uzusis-front`)

Angular 22 standalone, Tailwind 4 e spartan/ui 1.5 (estilo `vega`), testes em Vitest, build com o builder
`application` (esbuild). O Angular 22 exige Node `^22.22.3 || ^24.15`: todo `npm`/`ng` roda no contêiner
`node:22-alpine` (§11; o Node do host é 20).

### 7.1 Arquitetura e rotas
Sem NgModules: `main.ts` faz `bootstrapApplication(AppComponent, appConfig)`, e cada componente importa o que usa
(helm incluso). Estrutura:

```
libs/ui/<primitivo>/src/**   helm gerado pelo @spartan-ng/cli; código do projeto (§7.4). Import @spartan-ng/helm/<nome>,
                             mapeado em compilerOptions.paths do tsconfig.json
src/styles.css               Tailwind + preset do spartan + tema Uzusis (§7.2)
src/app/
  app.config.ts, app.routes.ts, app.component.*
  core/
    auth/  auth.config.ts, auth.service.ts, auth.guards.ts (autenticadoGuard, adminGuard), roles.ts
    api/   modelos.ts, catalogo/sacola/pedidos/pagamentos/perfil/cep.service.ts, params.ts, erros.ts (mensagemDeErro)
    interceptors/api.interceptor.ts
    util/  sacola.ts, endereco-form.ts (criarFormEndereco), ufs.ts, aviso.service.ts
  shared/   componentes uz-* (§7.4)
  layout/   shell, header, busca (uz-busca), footer, sacola-drawer, nao-encontrado
  features/{vitrine,checkout,conta,admin}/   páginas + <feature>.routes.ts (export default)
```

Rotas (`app.routes.ts`):
```ts
[
  { path: 'admin', canMatch: [adminGuard], loadChildren: () => import('./features/admin/admin.routes') },
  { path: '', component: ShellComponent, children: [
      { path: 'checkout', canActivate: [autenticadoGuard], loadChildren: () => import('./features/checkout/checkout.routes') }, // ''; ?pedido=:id retoma
      { path: 'pedido',   canActivate: [autenticadoGuard], loadChildren: () => import('./features/checkout/pedido.routes') },   // ':id'
      { path: 'conta',    canActivate: [autenticadoGuard], loadChildren: () => import('./features/conta/conta.routes') },     // '' → 'pedidos'; 'pedidos'; 'dados'
      { path: '',         loadChildren: () => import('./features/vitrine/vitrine.routes') },                                  // ''; 'loja'; 'produto/:id'
      { path: '**',       component: NaoEncontradoComponent },
  ]},
]
```
- `adminGuard` (canMatch):
  - sem sessão → `auth.login(url)` (volta para `/admin…` depois do login) e devolve `router.parseUrl(router.url)`,
    a URL atual (ou `/` no primeiro carregamento), e não `false`: com `false` o router tentaria as outras rotas e
    mostraria "Página não encontrada" (`**`) até o redirect;
  - com sessão e sem `ADMIN` → `UrlTree('/')` + aviso `Acesso restrito à administração`.
- `autenticadoGuard`: sem sessão válida (depois de tentar o refresh) → `auth.login(state.url)` e `false`.
- **Título por rota** (WCAG 2.4.2): `'<Página> — Uzusis'` ("Loja — Uzusis", "Finalizar compra — Uzusis", "Minha conta —
  Uzusis", "Administração — Uzusis", "Página não encontrada — Uzusis"; a home é "Uzusis"). O produto sobrescreve com
  `Title.setTitle(nome + ' — Uzusis')`.
- **Foco na navegação** (WCAG 2.4.3): o `AppComponent` escuta `NavigationEnd` (menos a primeira) e, quando o
  **caminho** muda (filtro ou página na query não tiram o foco do controle), foca o `main h1` (`tabindex="-1"`) ou o
  próprio `<main>`. O link "Pular para o conteúdo" também fica no `AppComponent`.

Providers (`app.config.ts`):
- `provideZoneChangeDetection()`: o app depende do zone.js (timers, polling, Stripe); sem isso o 21+ sobe zoneless;
- `provideRouter(ROTAS, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }))`;
- `provideHttpClient(withXhr(), withInterceptorsFromDi())` + `HTTP_INTERCEPTORS` → `ApiInterceptor` (classe);
- `provideOAuthClient()` + `{ provide: OAuthStorage, useFactory: () => localStorage }`;
- `provideAppInitializer(() => inject(AuthService).iniciar())` (§7.5; nunca rejeita);
- `LOCALE_ID='pt-BR'` (`registerLocaleData(localePt, 'pt-BR')`) e `DEFAULT_CURRENCY_CODE='BRL'`;
- `provideSpartanHlm()` (overlays do CDK sem popover: sheet e diálogo ficam acima do `<hlm-toaster>`) e
  `provideNgIconsConfig({ strokeWidth: 1.75 })` (ícones do helm com o traço do `uz-icone`).

**Change detection**: no 22 o OnPush é o padrão. Componente que altera campos num `subscribe` declara
`ChangeDetectionStrategy.Eager` (a migração pôs em todos os que existiam); componente só com signals (`uz-busca`,
`uz-paginador`) fica no padrão.

`environment.ts`: `{ production: true, issuer: null }`; `environment.development.ts` (só `ng serve`, por
`fileReplacements`) usa `issuer: 'http://localhost:8080/auth/realms/uzusis'`. O issuer efetivo é
`environment.issuer ?? location.origin + '/auth/realms/uzusis'`. `proxy.conf.json`: `/api` e `/storage` →
`http://localhost:8080`, sem `pathRewrite`. Nesta máquina a 8080 é de outro projeto: a validação visual é pelo
compose (§11), em 8088.

`angular.json` (projeto `uzusis`):
- build `@angular/build:application`, `outputPath: { "base": "dist/uzusis" }` → saída em **`dist/uzusis/browser`**
  (**contrato com o Dockerfile**, §8.1); `styles: ["src/styles.css"]`, `inlineStyleLanguage: "css"`. O PostCSS vem de
  `.postcssrc.json` (`@tailwindcss/postcss`);
- budgets: initial 1mb/1.5mb e anyComponentStyle 8kb/16kb;
- test `@angular/build:unit-test` (Vitest + jsdom), com `setupFiles: ["src/test-setup.ts"]` (patch do zone.js para
  `fakeAsync`/`tick`).

### 7.2 Design system
Tudo em `src/styles.css`, CSS puro: `@import 'tailwindcss'`, `@import '@spartan-ng/brain/hlm-tailwind-preset.css'`,
`@source '../libs/ui'`, os tokens em `:root` e o `@theme` (fontes, escala, breakpoints, sombras). Nenhuma cor literal
em componente: só as classes dos tokens (`bg-background`, `text-brand`…). Nenhum `.scss`/`.css` de componente: classes
no template.

Tema **só claro** (`color-scheme: light`, sem `.dark`). Tokens em **hex**: o checkout os lê com `getComputedStyle` e
repassa ao Stripe, que não aceita `oklch` nem `var()`. Papel das cores: **preto seleciona e age; marrom destaca e indica
foco; areia agrupa.**

| Token | Valor | Uso | Contraste (calculado) |
|---|---|---|---|
| `--background` | `#faf8f5` | fundo (papel) | — |
| `--foreground` | `#292524` | texto | 14,31 no papel |
| `--card` / `--popover` | `#ffffff` | cartões, sheet, menus, diálogos | — |
| `--primary` / `--primary-foreground` | `#1c1917` / `#faf8f5` | botão principal, pill e aba selecionadas | 16,50 (hover `/80`: 8,87) |
| `--secondary` = `--muted` = `--accent` | `#efe9e3` (areia) | pills, blocos, skeleton, hover de menu | texto primary: 14,52 |
| `--muted-foreground` | `#6b645e` | texto secundário | 5,49 no papel · 4,83 na areia |
| `--destructive` / `--destructive-muted` | `#a8231c` / `#fbe9e7` | erro, ação destrutiva, CANCELADO | 6,78 no papel · 6,13 no fundo |
| `--border` | `#e6e0da` | divisórias decorativas | — |
| `--input` | `#958d85` | borda de campo | 3,08 no papel (WCAG 1.4.11) |
| `--ring` | `#7a5a41` | anel de foco | 5,88 no papel |
| `--brand` / `-hover` / `-muted` / `-foreground` | `#7a5a41` / `#654a35` / `#f3ece5` / `#ffffff` | destaque: preço, links, total, badge da sacola, faixa do Instagram | 5,88 no papel · branco sobre ele 6,24 |
| `--success` / `-muted` | `#2f6b45` / `#e8f3ec` | PAGO, RECEBIDO, Ativo | 5,58 |
| `--warning` / `-muted` | `#8a5a00` / `#fbf1dc` | CRIADO, ENVIADO, Sem estoque, "Restam N" | 5,28 |
| `--sidebar-*` | branco; item ativo `#f3ece5` / `#654a35` | menu do admin | 6,94 |

`--brand*`, `--success*`, `--warning*` e `--destructive-muted` ficam fora do contrato shadcn e entram no Tailwind por
`@theme inline` (`text-brand`, `bg-warning-muted`…). `--radius: 0.75rem`; `--chart-*` existem pelo contrato, sem uso.

Escalas:
- **Fontes**: `font-sans` = Inter 400/500/600 (corpo, rótulos, botões); `font-display` = Scope One (h1–h3, logotipo,
  títulos de sheet e diálogo, KPIs). Google Fonts no `index.html`, com `preconnect` e `display=swap`.
- **Tipografia** (rem): `text-xs` 0,75 (`.uz-legenda`, maiúsculas, `tracking-[0.08em]`), `text-sm` 0,875, `text-base` 1,
  `text-lg` 1,125 (preço), `text-h3` 1,375, `text-h2` 1,75, `text-h1` 2,25, `text-hero` `clamp(2rem, 5vw, 3rem)`.
  `h1`–`h3` com `text-wrap: balance`. Pesos: rótulos e botões 500, preço e totais 600.
- **Forma**: entradas (input, select, qtd, textarea) `rounded-md` (≈ 10 px); ações e escolhas (botões, pills, chips,
  abas, badges) `rounded-full`; superfícies `rounded-lg` (fotos, miniaturas) e `rounded-xl` (cards, diálogos).
- **Sombras** quentes: `shadow-xs` `0 1px 2px 0 rgb(28 25 23 / .06)` (inputs, pills, cards), `shadow-sm` (hover de card
  clicável), `shadow-lg` `0 8px 24px rgb(28 25 23 / .12)` (sheet, menus). Card em repouso: `ring-1 ring-foreground/10` + `shadow-xs`.
- **Breakpoints** (mobile-first): `sm` 36rem, `md` 48rem, `lg` 62rem, `xl` 80rem (`sm` e `lg` sobrescritos no `@theme`).
  `.uz-container` = `mx-auto w-full max-w-[80rem] px-4 md:px-8`.
- **Foco**: `:focus-visible` com `outline-2 outline-offset-2` na cor `--ring`. O anel do helm é o cheio (`ring-ring`):
  o `ring-ring/50` do spartan daria 2,14:1.
- **Movimento**: `prefers-reduced-motion` zera animações e transições.
- **Alvos de toque** de 44 px: botões, inputs e selects `h-11`; tamanhos `sm`/`xs` só no admin a partir de `lg`.
- **Cascata**: o Tailwind 4 usa `@layer`, e CSS sem camada vence qualquer utilitário. Todo CSS global fica em
  `@layer base` (reset, títulos, `:focus-visible`, links de texto) ou `@layer components` (`.uz-container`, `.uz-titulo`,
  `.uz-legenda`, `.uz-preco`, `.uz-cartao`, `.uz-pill`).
- **Links de texto**: marrons e sublinhados (`a:not([data-slot])`; a cor sozinha dá 2,4:1 contra o texto, WCAG 1.4.1).
  Com `data-slot` (`hlmBtn`, item de menu) quem decide é o helm.
- **Pill** (`.uz-pill`, tamanhos e chips de categoria): areia com `shadow-xs`; selecionada (`:checked +` ou
  `aria-pressed="true"`) preta; esgotada ou desabilitada riscada, sem `opacity` (o texto mantém 4,83:1).
- **Ícones**: `uz-icone` (SVG inline 24×24, traço 1,75: sacola, usuario, busca, menu, fechar, mais, menos, lixeira,
  seta-esquerda/direita/baixo, chevron-esquerda/direita, check, alerta, regua) nos templates do app; o helm usa
  `@ng-icons/lucide` por dentro. Sem fonte de ícones.

**Convenções** (as telas seguem, para saírem iguais):
- **Campo**: `<div hlmField>` + `<label hlmFieldLabel for>` **acima** do campo (nunca flutuante) + `input hlmInput` +
  `p hlmFieldDescription` (opcional = descrição "Opcional") + `hlm-field-error validator="…"`, que aparece com o
  controle inválido e tocado, tem `role="alert"` e entra no `aria-describedby`. `<form novalidate>` e `required` nos
  obrigatórios.
- **Select**: `hlm-native-select` (select nativo, CVA; picker do SO no celular). O `ng-invalid` fica no host, que não
  recebe foco: para focar o primeiro inválido, `hlm-native-select.ng-invalid select`.
- **Adorno** (prefixo "R$", botão limpar, spinner): `hlm-input-group` + `hlm-input-group-addon`.
- **Botões**: principal `hlmBtn` (preto, pílula, 44 px; CTA de página `size="lg"`); secundária `variant="outline"`;
  destrutiva `variant="destructive"` + `AvisoService.confirmar`; texto `ghost`/`link`; ícone `size="icon"` +
  `aria-label`. Em voo: `[disabled]`, `<hlm-spinner aria-hidden="true" />` e o texto no gerúndio ("Salvando…").
- **Nativo antes de helm**: rádios para tamanhos, `<details>` para expansão, links com `aria-current="page"` para abas,
  `uz-paginador` para paginação.
- Título de página: `<h1 class="uz-titulo" tabindex="-1">`, um por página.
- Formatação: preço `| currency` (BRL); data `| date:'dd/MM/yyyy'`; data e hora `| date:'dd/MM/yyyy HH:mm'`.

### 7.3 Páginas

Toda página tem os estados **carregando** (`uz-esqueleto` com `aria-busy`, ou `uz-estado tipo="carregando"`; recarga
de lista já exibida = `hlm-progress` indeterminado no topo), **vazio** (`uz-estado` com mensagem + uma ação) e **erro**
(`uz-estado tipo="erro"`: `mensagemDeErro(err)` + "Tentar novamente"). Erro de ação em linha: `hlmAlert
variant="destructive"`; sucesso e erro transitório: toast (`AvisoService`).

**Shell (`layout/`)**
- "Pular para o conteúdo" como primeiro focável; `<main id="conteudo" tabindex="-1">`; a página rola na janela.
- **Faixa de avisos** (1º filho do `<header>`, preta, estática: sem rotação, sem região viva, sem números):
  `<ul aria-label="Avisos da loja">` com "Enviamos para todo o Brasil", "Pagamento seguro com cartão via Stripe"
  (≥ `md`) e "Trocas e atendimento: uzusis@gmail.com" (≥ `lg`, `mailto:` com foco claro: o marrom daria ~2,8:1 no preto).
- **Header** (`h-16`, papel, borda inferior). Celular: menu | logo | ⌕, conta, sacola. ≥ `lg`: logo | Loja,
  Categorias | busca | conta, sacola.
  - logotipo "UZUSIS" (Scope One, `tracking-[0.2em]`) com o monograma `assets/logoUzu.png` escurecido por filtro (a
    marca original dá ≈ 2,3:1), link para `/`; abaixo de 360 px o monograma some;
  - "Categorias" e conta em `hlm-dropdown-menu` (itens `min-h-11`): as 9 categorias → `/loja?categoria=X`; logado:
    "Minha conta", "Meus pedidos", "Administração" (só com ADMIN), separador e "Sair"; anônimo: "Entrar" e "Criar conta";
  - busca: `uz-busca` no header a partir de `lg`; no celular o ⌕ (`aria-label="Buscar peças"`,
    `aria-haspopup="dialog"`) abre a busca em tela cheia (abaixo);
  - sacola: `hlmBtn` ícone com `aria-label="Sacola, N itens"` e `hlmBadge` marrom (`aria-hidden`) quando N > 0.
- **Menu mobile**: `hlm-sheet side="left"` (`w-[min(20rem,85vw)]`) com Início, Loja, Categorias e Conta. Sheet = diálogo
  do CDK: foco preso, Esc, rolagem travada, foco devolvido ao gatilho. Fecha em `NavigationStart`/`NavigationSkipped`.
- **Footer** (`bg-secondary`, 3 colunas ≥ `md`): Sobre a loja (o texto das irmãs, a partir de "Com o mesmo sangue…",
  para não repetir o da home), Atendimento (`mailto:uzusis@gmail.com`, Instagram `@_uzusis`) e Categorias; headings
  `h2`/`h3`, nunca outro `h1`.
- **Sacola** (`hlm-sheet side="right"`, 100% no celular, `25rem` a partir de `sm`): linhas com miniatura, nome (link),
  tamanho, `uz-qtd` (O3), valor e remover (O4, com `aria-label`); rodapé fixo com subtotal, "Frete calculado no
  checkout" e "Finalizar compra" → `/checkout`. Vazia: "Sua sacola está vazia" + "Explorar a loja". Anônimo: "Entre
  para ver sua sacola" + "Entrar" (o `SacolaService` só chama O1 com `logado$` verdadeiro). Mudanças em `aria-live="polite"`.
- **404**: "Página não encontrada" + Início e Loja.

**Busca com sugestões (`layout/busca.ts`, `layout/busca.component.*`)**
Combobox próprio no padrão APG "combobox com listbox popup" (não há autocomplete no `libs/ui`). O foco **nunca** sai do
campo: a opção ativa vai em `aria-activedescendant`, e as opções são `div[role=option]` dentro de `role=group`
rotulados; o painel não tem nada tabulável. Só signals (OnPush). Dois modos: `popup` (header ≥ `lg`) e `tela` (celular:
`hlm-sheet side="top"` com `h-dvh`, título "Buscar peças" só para leitor de tela, painel sempre visível e botão
"Cancelar"; foco preso, Esc e foco devolvido ao ⌕ vêm do CDK).
- **Regras**: o termo passa por `trim`; **debounce de 300 ms** (igual à loja), **mínimo de 2 letras**, `switchMap` (a
  busca anterior é cancelada) e **1 chamada por termo**: C1 `nome=<q>&size=6&sort=criadoEm,desc`. Erro da chamada vira
  estado de erro, não exceção. Enquanto carrega, a resposta anterior continua, esmaecida (`opacity-60`), e o listbox
  fica `aria-busy`; na 1ª carga de um termo, 3 linhas de esqueleto (`aria-hidden`).
- **Grupos** (a ordem é a das setas; a última opção fica fixa no pé do painel):

  | Estado | Mensagem (fora do listbox) | Grupos | Opção final |
  |---|---|---|---|
  | campo vazio ou 1 letra | — | "Buscas recentes" (até 5, → `/loja?q=`) + "Limpar buscas recentes"; "Categorias": as 9 em pílulas → `/loja?categoria=X` | "Ver todas as peças" → `/loja` |
  | carregando | — | categorias por nome; "Produtos" anteriores, esmaecidos | "Ver resultados para “q”" → `/loja?q=` |
  | com resultado | — | "Categorias" (até 3) e "Produtos" (até 6 → `/produto/:id`) | "Ver todos os N resultados para “q”" (N = 1: "Ver 1 resultado…") → `/loja?q=` |
  | sem resultado | "Nenhuma peça encontrada para “q”." | categorias por nome; sem nenhuma, "Explore as categorias" com as 9 | "Ver todas as peças" → `/loja` |
  | erro | ícone + "Não foi possível buscar as peças agora." (`text-destructive`) | categorias por nome | "Buscar “q” na loja" → `/loja?q=` |

- **Categorias relacionadas** (até 3, sem acento nem caixa): nome igual a uma palavra do termo > prefixo, nos dois
  sentidos, com palavras de 2 letras ou mais (`calcas` → Calça; `sa` → só Saia; `body preto` → Body) > categoria de
  uma peça encontrada ("correlata": rótulo `“linho” em Blusa` → `/loja?categoria=BLUSA&q=linho`; com termo de 2 letras,
  só o nome, com o mesmo filtro).
- **Produto**: miniatura 3:4 (`alt=""`, lazy), nome com o trecho digitado em `<strong>` (`destacar()`, sem
  `innerHTML`), categoria e preço marrom.
- **Buscas recentes**: `localStorage['uz-buscas-recentes']`, até 5, sem duplicar ("Calça" = "calca"), termos de 2+
  letras (cortados em 100); leitura e escrita em `try/catch` (aba privada só não lembra). Gravam: Enter com 2+ letras e
  qualquer opção escolhida com termo. "Limpar buscas recentes" apaga a chave e **mantém** o popup aberto.
- **Teclado** (foco no campo): ↓ abre (fechado) ou vai à próxima (da última volta à 1ª); ↑ vai à anterior (da 1ª, ou
  sem ativa, à última); Enter com opção ativa escolhe, sem ativa envia o form (`/loja?q=`; vazio → `/loja`); Esc com o
  popup aberto fecha e mantém o texto, fechado limpa, no modo tela não é tratado (o CDK fecha o sheet); Tab fecha o
  popup; ←/→/Home/End zeram a opção ativa. O popup abre com clique, digitação ou ↓, **não** ao receber foco pelo Tab.
  Clique fora (`focusout` para fora do componente) e `NavigationStart` fecham. Escolher limpa o campo e navega.
- **Leitor de tela**: `<p role="status">`, só com a resposta do termo atual: "N peças encontradas. Use as setas para
  ver as sugestões.", "1 peça encontrada…", a mensagem de vazio ou a de erro.
- **Estilo**: popup `absolute top-full right-0 z-50 mt-3`, `w-[min(28rem,calc(100vw-2rem))]`, `rounded-xl`,
  `shadow-lg`, `ring-1`; `(mousedown)` com `preventDefault` mantém o foco no campo. Opção ativa com `aria-selected` +
  anel marrom `ring-2 ring-inset ring-ring` (a areia sozinha dá ~1,2:1). O campo é uma pílula (`hlm-input-group
  rounded-full`), `type="search"`, `maxlength="100"`, sem autocorreção.

**Home `/` (vitrine)** — uma chamada só: C1 `size=48&sort=criadoEm,desc` (no carregamento e no "Tentar novamente");
nenhuma a `/categorias` (usa `CATEGORIAS`). Seções, na ordem:
1. **Hero** (2 colunas `md:grid-cols-[2fr_3fr]`): legenda "Moda feminina minimalista", h1 `text-hero` "Peças pensadas
   para o seu corpo", apoio e CTA "Ver coleção" → `/loja` (largura total no celular). Imagem: o banner da coleção Basic
   Sis (`assets/banner-colecao.jpeg`, 16:9 com o texto da arte, `alt` descritivo, `fetchpriority="high"`). No celular
   o banner vem **antes** só visualmente (`max-md:order-first`, no DOM o h1 vem primeiro) e sangra até as bordas.
2. **Compre por categoria**: 9 círculos com foto (`ring-2 ring-brand/40`, 72 px; 80 px em `lg`, 112 px em `xl`) →
   `/loja?categoria=X`. Capa = 1ª foto da peça mais nova com foto de cada categoria entre as 48 (`capasPorCategoria`);
   sem capa, a inicial. Abaixo de `lg`, trilho com rolagem lateral e snap (metade do 4º círculo aparece a 390 px);
   a partir de `lg`, uma linha de 9. Foto com `alt=""` (o nome do link é o da categoria).
3. **Novidades**: as 8 primeiras em `uz-produto-card` + "Ver tudo" → `/loja`. Celular: trilho com cards de 42% e um
   card final "Ver todas as N peças"; a partir de `md`, grade de 3 e 4 (`lg`) colunas. Vazio: "Novidades chegando em
   breve" + "Acompanhe no Instagram"; erro: "Não foi possível carregar as novidades" + "Tentar novamente".
4. **Envio, pagamento e trocas** (h2 só para leitor de tela; cartão com 4 itens, 1/2/4 colunas): "Enviamos para todo
   o Brasil" (frete por estado, no checkout), "Pagamento seguro com cartão" (Stripe), "Trocas e atendimento" (e-mail e
   Instagram) e "Peças em quantidade limitada" (o selo "Últimas unidades"). Sem valores, prazos nem `R$`.
5. **Nossa história**: trecho literal do texto das irmãs ("Sonhada desde 2022, finalmente ganhamos forma.", h2
   `text-h2 md:text-h1`).
6. **Instagram** (`bg-brand-muted`, colada no rodapé): avatar com anel, "Siga a Uzusis no Instagram", "Seguir
   @_uzusis" → `https://www.instagram.com/_uzusis/` e "Chamar no direct" → `https://ig.me/m/_uzusis`.

Nenhum texto inventado: sem "mais vendidos", avaliações, cupom, desconto, contador ou frete grátis. Categorias com
esqueleto enquanto carregam e iniciais em erro; Novidades com 8 esqueletos no formato do trilho ou da grade.

**Loja `/loja` (vitrine)**
- A URL é a fonte do estado: `?categoria=BLUSA&q=linho&ordem=recentes|menor-preco|maior-preco`, com `ordem` → `sort`
  `criadoEm,desc` | `preco,asc` | `preco,desc`. Categoria ou ordem desconhecida vira o padrão.
- `queryParamMap` + `switchMap` recomeçam a lista; mudança de filtro usa `router.navigate(..., {queryParamsHandling:'merge'})`,
  e a busca usa `replaceUrl`.
- Título: nome da categoria ou "Loja", com "N peças" (`aria-live`).
- Filtros: chips `.uz-pill` com `aria-pressed` e "Todas" (rolagem horizontal no celular); busca "Buscar na loja" com
  rótulo acima, lupa e "Limpar busca" (debounce de 300 ms, 1 letra não busca); `hlm-native-select` "Ordenar por".
- Grade de 2, 3 e 4 colunas em `sm`, `md` e `lg`. **"Carregar mais"**: página `number+1` com os mesmos filtros,
  acrescentada sem repetir; some quando `last`; desabilitado com spinner enquanto carrega; "Mostrando X de Y".
  Página de 12.
- Vazio: "Nenhuma peça encontrada" + "Limpar filtros".
- **`uz-produto-card`**: um `<a routerLink>` com a foto 3:4 (`loading="lazy"`, alt = nome), nome (até 2 linhas),
  preço e o selo **"Últimas unidades"** (`hlmBadge`) quando o **estoque total da peça** (soma dos tamanhos) está
  **entre 1 e 3**.

**Produto `/produto/:id` (vitrine)**
- `GET /api/produtos/{id}`; se 404 → "Produto não encontrado" + link para a loja.
- **Galeria** (`uz-galeria`): miniaturas (botões, a atual com `aria-current`) + imagem principal ≥ `md`; faixa com
  `scroll-snap` e indicadores no celular; alt `"{nome} — foto i de n"`; sem foto, placeholder.
- **Coluna de informação** (sticky ≥ `lg`): categoria (link), nome em `h1`, preço;
  - **tamanhos** em **rádios nativos** estilizados como `.uz-pill`, num `role="radiogroup"` rotulado "Tamanho", na
    ordem PP..GG: as setas trocam; esgotado fica `disabled`, riscado e com `aria-label="M, esgotado"`; "Restam N neste
    tamanho" quando 1..3;
  - "Guia de medidas" (`hlmBtn variant="link"`) abre um diálogo (`HlmDialogService`) com uma tabela estática em cm:

    | Tam. | Busto | Cintura | Quadril |
    |---|---|---|---|
    | PP | 80–84 | 60–64 | 86–90 |
    | P | 84–88 | 64–68 | 90–94 |
    | M | 88–92 | 68–72 | 94–98 |
    | G | 92–98 | 72–78 | 98–104 |
    | GG | 98–104 | 78–84 | 104–110 |

  - `uz-qtd` de 1 até `min(estoque do tamanho, 10)`;
  - **"Adicionar à sacola"** (`size="lg"`, largura total): desabilitado sem tamanho, com a ajuda "Escolha um tamanho";
    anônimo → `auth.login('/produto/:id?tamanho=M')`, e na volta o tamanho vem pré-selecionado; sucesso → abre a
    sacola e avisa; 422 → mostra o `detail`.
- Dois `<details>`: "Descrição" (aberto) e "Trocas e envio" (texto estático **sem valores**: "Frete calculado no
  checkout conforme o estado").

**Checkout `/checkout`**
- Na entrada: `forkJoin(config, carrinho, perfil)`. Sacola vazia (e sem `?pedido`) → estado vazio + link para a loja.
- Grade `lg:grid-cols-[1fr_24rem]`; etapas numeradas com `aria-current="step"`.
- **Passo 1 — Entrega**: `uz-endereco-form` pré-preenchido com `perfil.endereco`, `destinatario = perfil.nome` e
  `telefone = perfil.celular`; ViaCEP preenche rua, bairro, cidade e UF; `hlm-checkbox` "Salvar este endereço no meu
  perfil" (marcado; salva com I3 antes de criar o pedido e, se o perfil não tem `celular` e o telefone veio, I2
  `{celular}`); UF válida → O5 mostra o frete.
- **Resumo** (`hlmCard`): sticky à direita ≥ `lg`, recolhível no topo do celular ("Ver itens"). Itens, subtotal, frete e total.
- **Sem pagamento configurado** (`config.habilitado == false`): `hlmAlert` de aviso com `role="status"` **"Pagamento
  ainda não configurado. Não é possível finalizar compras no momento."**; "Ir para o pagamento" **desabilitado**; o
  pedido **não** é criado.
- "Ir para o pagamento": desabilitado + spinner em voo; O6 → atualiza a sacola (vazia) → passo 2; 422 `Itens
  indisponíveis: …` → `detail`, recarrega a sacola e fica no passo 1; 409 `Você já tem um pedido aguardando
  pagamento.` → `detail` + "Ver meus pedidos" → `/conta/pedidos`, onde o pedido `CRIADO` tem "Concluir pagamento".
- **Passo 2 — Pagamento**:
  - P2 com nova tentativa a cada 1 s em caso de 404, por até 20 s. 409 → `/pedido/:id`.
  - `loadStripe(publishableKey)` uma vez, com cache. Falha → "Não foi possível carregar o pagamento. Verifique sua conexão."
  - `stripe.elements({ clientSecret, locale: 'pt-BR', appearance: aparenciaStripe() })` → `create('payment')` →
    `mount` (contêiner com `min-h-72`). `aparenciaStripe()` lê os tokens de §7.2 (`--primary`, `--card`,
    `--foreground`, `--muted-foreground`, `--destructive`, `--input`, `--ring`, `--border`): Inter 16 px, rótulos
    acima, campos brancos com borda `--input` e raio 10 px, foco marrom de 2 px, aba selecionada preta.
  - **"Pagar R$ X"** (X = `valorTotal` do pedido):
    `stripe.confirmPayment({ elements, confirmParams: { return_url: location.origin + '/pedido/' + id }, redirect: 'if_required' })`.
    - `error.type === 'validation_error'` → mostra `error.message` e **fica** na tela;
    - **qualquer outro erro** → desabilita "Pagar", marca o pedido como recusado (`localStorage`) e vai para
      `/pedido/:id?recusado=1`. Uma recusa cancela o pedido (webhook `payment_failed`). **Nunca** chamar
      `confirmPayment` duas vezes no mesmo intent depois de uma recusa;
    - sucesso → `/pedido/:id`.
  - Texto: "Conclua o pagamento até {expiraEm | date:'HH:mm'}".
- **Retomar**: `/checkout?pedido=:id` → O8. Se `CRIADO` (e não recusado), vai direto ao passo 2; senão, `/pedido/:id`.

**Confirmação `/pedido/:id`**
- O8 com polling a cada 2 s enquanto `CRIADO`, por até 2 min; depois, "Ainda processando — você receberá um e-mail" +
  "Atualizar". O status é anunciado em `aria-live`.

| Status | Tela |
|---|---|
| `CRIADO` | "Processando pagamento…" + "Ainda não pagou? Concluir pagamento" → `/checkout?pedido=id`. Com `?recusado=1` ou `redirect_status=failed`: "Pagamento recusado. Aguarde a confirmação do cancelamento…", **sem** o link. |
| `PAGO` | "Pedido confirmado!", número, cards Andamento (`uz-linha-do-tempo`), Itens (com totais) e Entrega, + "Ver meus pedidos". |
| `CANCELADO` | card com contorno vermelho, motivo e "Voltar à loja". Só com `sacolaRestaurada: true`: "Os itens voltaram para a sua sacola; finalize de novo para tentar outro cartão." + "Tentar novamente" → `/checkout`. |
| `ENVIADO`, `RECEBIDO` | o layout de PAGO, com a linha do tempo. |

**Conta `/conta`** — abas como **links** (`nav aria-label="Seções da conta"`, `routerLinkActive` +
`ariaCurrentWhenActive="page"`, pílulas sobre `bg-muted`) para `pedidos` e `dados`.
- **Pedidos**: O7, em `article.pedido` (`hlmCard`, `aria-labelledby`): "Pedido #id · dd/MM/yyyy", `uz-status-pedido`,
  até 4 miniaturas e total; `<details>` "Detalhes do pedido #id" com `uz-linha-do-tempo`, itens, endereço e
  subtotal/frete/total. Ações: `CRIADO` → "Concluir pagamento"; `ENVIADO` → "Confirmar recebimento" (confirmação →
  O9). Vazio: "Você ainda não fez pedidos" + "Ir para a loja".
- **Dados** (3 `section hlmCard`): dados pessoais (nome "Nome para entrega", com a ajuda "Usado como destinatário
  padrão. O nome da conta é o do cadastro."; CPF `uzMascara="cpf"`; celular `uzMascara="celular"`; nascimento
  `<input type="date">`) → I2; endereço (`uz-endereco-form`) → I3; e-mail só leitura ("E-mail e senha são gerenciados
  no login") + "Alterar senha" → `auth.alterarSenha()`. Um "Salvar" por seção, erros por campo e toast de sucesso.

**Admin `/admin`** — `AdminShellComponent`, fora do shell da loja, com o próprio `<main>`:
- menu (Painel, Produtos, Pedidos a enviar, Histórico, "Ver loja", "Sair"; links com `aria-current="page"`): `aside`
  fixo `w-64` ≥ `lg` e `hlm-sheet side="left"` abaixo, com o mesmo template; o CSS decide qual aparece, e o sheet fecha
  ao navegar. Barra superior com hambúrguer (`lg:hidden`), "Administração" e o nome do usuário.

Telas:
- **Painel**: `forkJoin(O12, C4 ativo=true&disponivel=false&size=1, O10 status=PAGO size=5)`; KPIs em `hlmCard`:
  Receita do mês, A enviar (`porStatus.PAGO`), Enviados (`porStatus.ENVIADO`), Sem estoque (`totalElements` do C4, link
  para `/admin/produtos?situacao=sem-estoque`); lista "Próximos a enviar"; erro → estado de erro (**nunca** zeros falsos).
- **Produtos** (C4, paginação no servidor): tabela `hlmTable` dentro de `hlmTableContainer` (miniatura, nome,
  categoria, preço, estoque em badges "P 3" com o zerado em vermelho, situação Ativo/Inativo/Sem estoque, ações Editar e
  Desativar/Reativar com confirmação); abaixo de `md`, colunas empilhadas na célula do nome. Filtros refletidos na URL:
  "Buscar por nome" (debounce), categoria e situação em `hlm-native-select` (Ativo → `ativo=true`; Inativo →
  `ativo=false`; Sem estoque → `ativo=true&disponivel=false`). `uz-paginador` de 20. "Novo produto".
- **Produto** (`/admin/produtos/novo` e `/admin/produtos/:id`, **um componente**, pré-preenchido na edição), em 3 cards:
  - **Informações**: nome, categoria (`hlm-native-select`, obrigatória), preço (prefixo "R$", `inputmode="decimal"`,
    aceita `59,90`), descrição com contador;
  - **Estoque**: 5 campos PP..GG (≥ 0) num `fieldset`; envia só as siglas que já existem ou com valor > 0 (C6 na
    criação, C8 na edição). Na criação, pelo menos um > 0 ("Informe o estoque de pelo menos um tamanho"). Aviso: "Um
    tamanho criado não pode ser removido depois, só zerado.";
  - **Fotos** (`uz-gerenciador-fotos`): na criação, até 6 arquivos validados no cliente (tipo e 5 MB), com prévia por
    `URL.createObjectURL`; ao salvar, C6 → C10 em sequência, e uma falha deixa a edição aberta com o erro por foto. Na
    edição, upload ao selecionar, remover com confirmação (C11) e reordenar pelos botões "mover para a
    esquerda/direita" → C12 (mouse, toque e teclado). A primeira é a capa (selo "Capa");
  - "Salvar" desabilitado em voo; ao salvar com erro, o foco vai ao primeiro campo inválido; erros do servidor por `detail`.
- **Pedidos a enviar**: O10 `status=PAGO`, `sort=pagoEm,asc`; cards `article.pedido` com #id, data do pagamento,
  cliente (nome, e-mail), telefone, **endereço completo**, itens (miniatura, nome, **tamanho**, quantidade) e total;
  "Marcar como enviado" (confirmação → O11) recarrega a página atual e avisa. `uz-paginador` de 20 no servidor.
- **Histórico**: O10 `status=ENVIADO&status=RECEBIDO&sort=enviadoEm,desc`, com status e datas, e o mesmo paginador.

### 7.4 Componentes compartilhados (`shared/`) e helm

| Seletor | Entradas e saídas | Notas |
|---|---|---|
| `uz-icone` | `nome`, `tamanho=20`, `rotulo?` | `aria-hidden` sem rótulo; com rótulo, `role="img"` |
| `uz-qtd` | `valor`, `min=1`, `max=99`, `rotulo`, `desabilitado`, `(valorChange)` | botões −/+ `ghost icon` com `aria-label`; input numérico central |
| `uz-estado` | `tipo: 'carregando'\|'vazio'\|'erro'`, `titulo`, `mensagem`, `(tentarNovamente)`; `ng-content` para ações | `role="status"`/`aria-busy` carregando; `role="alert"` no erro |
| `uz-esqueleto` | `formato: 'cartao'\|'linha'`, `quantidade` | `hlmSkeleton`; `display: contents`, `aria-hidden` |
| `uz-status-pedido` | `status` | `hlmBadge` com o rótulo de §4.1 e as cores de §7.2 |
| `uz-linha-do-tempo` | `pedido: PedidoResposta` | `<ol>` com etapas e datas, `aria-current="step"`; o ramo cancelado em destaque |
| `uz-endereco-form` | `[form]: FormGroup` (de `criarFormEndereco(fb, inicial?)`) | CEP com ViaCEP (`CepService`, sem token) e spinner no adorno; UF em `hlm-native-select` com as 27; mensagens de §4.3 |
| `[uzMascara]` | `'cpf'\|'celular'\|'cep'` | CVA que formata ao digitar; o backend normaliza |
| `uz-paginador` | `pagina` (0-based), `tamanho`, `total`, `(mudar)` | `nav aria-label="Paginação"`, `rotuloIntervalo` (`'1 – 20 de 37'`, `'0 de N'`) em `aria-live`, "Página anterior"/"Próxima página" (somem com uma página só) |
| `uz-confirmacao-dialog` | contexto `{titulo, texto, rotuloOk}` | aberto por `AvisoService.confirmar` |
| `AvisoService` | `sucesso(msg)`, `erro(err)`, `confirmar(titulo, texto, rotuloOk): Observable<boolean>` | toast do `<hlm-toaster position="bottom-center">` (sucesso 5 s, `aria-live` polite; erro 8 s, `important` → assertive) e `HlmDialogService` com `role="alertdialog"` (Esc, fora e "Cancelar" = `false`; volta à zona do Angular ao fechar) |

`mensagemDeErro(err)` (`core/api/erros.ts`), nesta ordem:
1. corpo com ProblemDetail (`detail` string) → `detail`;
2. status 0 → "Sem conexão com o servidor";
3. 401 → "Sua sessão expirou. Entre novamente."; 403 → "Acesso negado";
4. 413 → "Arquivo maior que 5 MB." (o nginx responde HTML acima de 8 MB);
5. 502, 503 ou 504 → "Serviço temporariamente indisponível. Tente novamente.";
6. resto → "Erro inesperado. Tente novamente.".

`core/api` tem um serviço por grupo de endpoints (tipos de §4). A sacola fica no `SacolaService` (`carrinho$`,
`quantidade$`, `aberta$`, `carregar()`, `adicionar()`, `alterar()`, `remover()`, `abrir()`, `fechar()`).

**Helm (`libs/ui`)**: alert, badge, button, card, checkbox, dialog, dropdown-menu, field, input, input-group, label,
native-select, progress, separator, sheet, skeleton, sonner, spinner, table, textarea e utils. Foram gerados com
`components.json` = `{ componentsPath: "libs/ui", importAlias: "@spartan-ng/helm", style: "vega" }` e ajustados à
mão: alturas de 44 px (`h-11`), anel de foco cheio (`ring-ring`) e textos em pt-BR ("Fechar", "Carregando"). Não
gerados de propósito: select, pagination, tabs, accordion, toggle-group, sidebar, alert-dialog (nativo ou `uz-*`
cobrem). Para gerar outro: instalar o `@spartan-ng/cli@1.5.0` (puxa o Nx, ~200 MB) só durante a geração,
`npx ng g @spartan-ng/cli:ui <nome>`, desinstalar e reaplicar os ajustes. O código gerado é nosso.

### 7.5 Fluxo de autenticação
- `angular-oauth2-oidc@22.0.2`, com este `AuthConfig`:
  - `issuer` (§7.1), `clientId: 'web-app'`, `responseType: 'code'`, `scope: 'openid profile email'`;
  - `redirectUri: location.origin + '/'`, `postLogoutRedirectUri: location.origin + '/'`;
  - `requireHttps: false` (TLS é da borda), `sessionChecksEnabled: false`, `clearHashAfterLogin: true`,
    `showDebugInformation: false`;
  - storage = `localStorage` (a sessão sobrevive a outra aba).
- `AuthService.iniciar()` (`provideAppInitializer`): `configure` → `setupAutomaticSilentRefresh()` (usa o refresh
  token) → `loadDiscoveryDocumentAndTryLogin()` → se `!hasValidAccessToken() && getRefreshToken()`,
  `await refreshToken().catch(() => logOut(true))`. Sem esse passo, quem volta depois de 15 min (vida do access
  token) parece deslogado, porque a lib só agenda o refresh de um token ainda válido. Se a discovery falhar
  (Keycloak fora ou subindo), o app **continua anônimo**: a vitrine funciona e a falha só vai para o log.
- Depois do login, navegar para o `state` (a returnUrl).
- `AuthService`:
  - `logado$`;
  - `usuario$`: `{nome, email, roles}`. `nome` e `email` vêm dos claims do id token; `roles` vem de
    `realm_access.roles` do **access token**, decodificado com `jwt-decode`, porque o id token não traz roles.
  - `isAdmin()`;
  - `login(returnUrl?)` → `initCodeFlow(returnUrl)`;
  - `cadastrar()` → `initCodeFlow('/', { prompt: 'create' })`. Se o Keycloak ignorar, cai no login, que tem o link "Cadastre-se".
  - `login()`, `cadastrar()` e `alterarSenha()` chamam antes `loadDiscoveryDocument()` quando a discovery não
    carregou no boot. Se falhar: aviso "Login indisponível, tente em instantes".
  - `alterarSenha()` → `initCodeFlow(router.url, { kc_action: 'UPDATE_PASSWORD' })`;
  - `logout()` → `logOut()`, fim de sessão com `id_token_hint`.
- `ApiInterceptor`:
  - anexa `Bearer` **só** para URLs que começam com `/api` **e** com `hasValidAccessToken()`. Token vencido não
    é enviado, porque em rota pública daria 401;
  - 401 numa requisição **sem** token → só repassa o erro (um anônimo nunca é jogado no Keycloak);
  - 401 **com** token num GET público (`/api/produtos…` menos `/api/produtos/admin…`, e `/api/pagamentos/config`) →
    `logOut(true)` local e repete **uma** vez sem `Authorization`. Acontece com uma assinatura que deixou de valer
    (realm reimportado);
  - 401 **com** token nas demais rotas → `auth.login(router.url)`, no máximo uma vez a cada 60 s (marca com horário
    em `sessionStorage`, que sobrevive ao redirect). Com a marca recente: `logOut(true)` local e repassa o erro.
    Isso evita o laço login → 401 → login quando o `iss` diverge (`PUBLIC_URL` errado, acesso por IP);
  - nunca anexa token a `viacep.com.br` nem à Stripe.
- Sem `console.log` de token (nem de nada: §11.6).

### 7.6 Acessibilidade (critério de aceite)
- `lang="pt-BR"`.
- Um `h1` por página; `title` por rota e foco no `h1` depois de navegar (§7.1).
- Todo controle é `button`, `a` ou campo nativo. Nada de `(click)` em `div`, `img` ou `article` (as opções da busca
  são `role=option` de um combobox, com o foco no campo, §7.3).
- Labels em todos os campos (`hlmFieldLabel` com `for`, ou `sr-only`); erros em `hlm-field-error`.
- Imagens com `alt` (decorativas com `alt=""`).
- Foco visível (§7.2); sheets e diálogos com foco preso, Esc e foco devolvido.
- Tamanho esgotado `disabled` + texto.
- `aria-live` na sacola, no polling do pedido, na contagem da loja, na busca e nos toasts.
- Contraste de §7.2; alvos de 44 px.
- Página inteira utilizável por teclado, incluindo a reordenação de fotos pelos botões e a busca pelas setas.
- Sem rolagem horizontal em 390 px (e em 320, conferido).

### 7.7 Dependências, testes e build
- **Dependências**: `@angular/*` 22.2 (`core`, `common`, `compiler`, `forms`, `platform-browser`, `router`, `cdk`),
  `@spartan-ng/brain` 1.5.0 (fixo), `@ng-icons/core` e `@ng-icons/lucide` 32, `class-variance-authority`, `clsx`,
  `tailwind-merge`, `angular-oauth2-oidc` 22.0.2, `@stripe/stripe-js` ^9.17, `jwt-decode`, `rxjs` 7.8, `zone.js` 0.16,
  `tslib`. Dev: `@angular/build`, `@angular/cli`, `@angular/compiler-cli`, `tailwindcss` 4 + `@tailwindcss/postcss` +
  `postcss`, `tw-animate-css`, `typescript` ~6.0, `vitest` 5 e `jsdom`. **Fora**: `@angular/material`,
  `@angular/animations` (o brain anima com `tw-animate-css`; o CDK fica, o brain depende dele), Karma e Jasmine.
- Lock: `npm ci`/`npm install` sem `--legacy-peer-deps`; o `package-lock.json` é commitado junto.
- **Testes** (Vitest + jsdom; `fakeAsync`/`tick` funcionam pelo patch do zone.js em `src/test-setup.ts`): 18 arquivos,
  entre eles `core/util/sacola.spec.ts`, `core/auth/roles.spec.ts`, `core/api/erros.spec.ts`, `shared/paginador.spec.ts`
  (`rotuloIntervalo`), `features/vitrine/vitrine.spec.ts` (filtro da URL, `acrescentar`, "Últimas unidades",
  `capasPorCategoria`), `layout/busca.spec.ts` (`destacar`, `categoriasRelacionadas`, recentes, `montarPainel`),
  `features/checkout/fluxo.spec.ts` e `aparencia-stripe.spec.ts`, e specs de template (produto, conta, dados,
  produtos e formulário do admin). `package.json`: `"test:ci": "ng test --watch=false"`.
- **Build**: `ng build` (produção por padrão) → `dist/uzusis/browser`, com hash de 8 caracteres base64url nos nomes
  (`main-XXXXXXXX.js`, `chunk-…`); o `nginx.conf` depende desse formato (§8.2).
- Nenhuma chave `pk_test_`/`pk_live_` em `src` (nem em spec): a publishable key só vem de P1.

---

## 8. Infra

### 8.1 `docker-compose.yml` (raiz): referência
O dono (a) pode ajustar detalhes, mas **não** a semântica.

```yaml
name: uzusis

x-java: &java
  image: uzusis-api:dev
  build: { context: ./uzusis-api }          # igual nos 6 → um build (bake deduplica)
  restart: unless-stopped
  mem_limit: 512m
  healthcheck:
    test: ["CMD-SHELL", "wget -q -O /dev/null http://127.0.0.1:$${SERVER_PORT}/actuator/health || exit 1"]
    interval: 10s
    timeout: 5s
    retries: 30
    start_period: 60s

x-db-senhas: &db-senhas          # init.sql (só com pg-data vazio), serviços e registrar do Debezium
  CATALOG_DB_PASSWORD: ${CATALOG_DB_PASSWORD:-catalog}
  ORDERS_DB_PASSWORD: ${ORDERS_DB_PASSWORD:-orders}
  PAYMENTS_DB_PASSWORD: ${PAYMENTS_DB_PASSWORD:-payments}
  NOTIFICATIONS_DB_PASSWORD: ${NOTIFICATIONS_DB_PASSWORD:-notifications}
  IDENTITY_DB_PASSWORD: ${IDENTITY_DB_PASSWORD:-identity}

x-java-env: &java-env
  JAVA_TOOL_OPTIONS: "-XX:MaxRAMPercentage=50 -XX:+UseSerialGC -Xss512k -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError"
  KAFKA_BOOTSTRAP: kafka:9092
  KEYCLOAK_ISSUER: ${PUBLIC_URL:-http://localhost:${WEB_PORT:-8080}}/auth/realms/uzusis
  KEYCLOAK_JWKS_URI: http://keycloak:8080/auth/realms/uzusis/protocol/openid-connect/certs
  MANAGEMENT_TRACING_ENABLED: ${TRACING_ENABLED:-false}
  OTLP_ENDPOINT: http://jaeger:4318/v1/traces

services:
  web:
    build: ./uzusis-front
    image: uzusis-web:dev
    restart: unless-stopped
    ports: ["${WEB_BIND:-127.0.0.1}:${WEB_PORT:-8080}:80"]   # WEB_BIND=0.0.0.0 abre para a rede
    mem_limit: 64m
    depends_on:
      gateway: { condition: service_started }
      keycloak: { condition: service_started }
      minio: { condition: service_started }
    healthcheck: { test: ["CMD-SHELL", "wget -q -O /dev/null http://127.0.0.1/ || exit 1"], interval: 10s, retries: 10 }

  gateway:
    <<: *java
    mem_limit: 384m
    environment:
      <<: *java-env
      MODULO: gateway
      SERVER_PORT: "8080"
      CATALOG_URL: http://catalog-service:8082
      ORDER_URL: http://order-service:8083
      PAYMENT_URL: http://payment-service:8084
      IDENTITY_URL: http://identity-service:8086

  catalog-service:
    <<: *java
    depends_on:
      postgres: { condition: service_healthy }
      kafka: { condition: service_healthy }
      minio-init: { condition: service_completed_successfully }
    environment:
      <<: *java-env
      MODULO: catalog-service
      SERVER_PORT: "8082"
      DB_URL: jdbc:postgresql://postgres:5432/catalog
      DB_USER: catalog
      DB_PASSWORD: ${CATALOG_DB_PASSWORD:-catalog}
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER:-uzusis}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD:-uzusis-minio-dev}
      MINIO_BUCKET: ${MINIO_BUCKET:-produtos}
      MINIO_PUBLIC_PREFIX: /storage

  order-service:
    <<: *java
    depends_on: { postgres: { condition: service_healthy }, kafka: { condition: service_healthy } }
    environment:
      <<: *java-env
      MODULO: order-service
      SERVER_PORT: "8083"
      DB_URL: jdbc:postgresql://postgres:5432/orders
      DB_USER: orders
      DB_PASSWORD: ${ORDERS_DB_PASSWORD:-orders}
      CATALOG_URL: http://catalog-service:8082
      FRETE_PADRAO: ${FRETE_PADRAO:-40.00}
      FRETE_POR_UF: ${FRETE_POR_UF:-CE=10.00}
      PEDIDO_EXPIRACAO_MINUTOS: ${PEDIDO_EXPIRACAO_MINUTOS:-30}

  payment-service:
    <<: *java
    depends_on: { postgres: { condition: service_healthy }, kafka: { condition: service_healthy } }
    environment:
      <<: *java-env
      MODULO: payment-service
      SERVER_PORT: "8084"
      DB_URL: jdbc:postgresql://postgres:5432/payments
      DB_USER: payments
      DB_PASSWORD: ${PAYMENTS_DB_PASSWORD:-payments}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-}
      STRIPE_PUBLISHABLE_KEY: ${STRIPE_PUBLISHABLE_KEY:-}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:-}
      STRIPE_API_BASE: ${STRIPE_API_BASE:-}
      STRIPE_MOEDA: ${STRIPE_MOEDA:-brl}

  notification-service:
    <<: *java
    depends_on:
      postgres: { condition: service_healthy }
      kafka: { condition: service_healthy }
      mailpit: { condition: service_started }
    environment:
      <<: *java-env
      MODULO: notification-service
      SERVER_PORT: "8085"
      DB_URL: jdbc:postgresql://postgres:5432/notifications
      DB_USER: notifications
      DB_PASSWORD: ${NOTIFICATIONS_DB_PASSWORD:-notifications}
      EMAIL_SERVER: ${SMTP_HOST:-mailpit}
      EMAIL_PORT: ${SMTP_PORT:-1025}
      EMAIL_USER: ${SMTP_USER:-}
      EMAIL_PASSWORD: ${SMTP_PASSWORD:-}
      EMAIL_AUTH: ${SMTP_AUTH:-false}
      EMAIL_TLS: ${SMTP_STARTTLS:-false}
      EMAIL_FROM: ${EMAIL_FROM:-Uzusis <nao-responda@uzusis.local>}
      PUBLIC_URL: ${PUBLIC_URL:-http://localhost:${WEB_PORT:-8080}}

  identity-service:
    <<: *java
    depends_on: { postgres: { condition: service_healthy } }
    environment:
      <<: *java-env
      MODULO: identity-service
      SERVER_PORT: "8086"
      DB_URL: jdbc:postgresql://postgres:5432/identity
      DB_USER: identity
      DB_PASSWORD: ${IDENTITY_DB_PASSWORD:-identity}

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    command: >
      postgres -c wal_level=logical -c max_wal_senders=10 -c max_replication_slots=10
               -c max_slot_wal_keep_size=1GB
    environment:
      <<: *db-senhas                        # o init.sql lê com \getenv
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    volumes:
      - pg-data:/var/lib/postgresql/data
      - ./uzusis-api/infra/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    mem_limit: 512m
    healthcheck: { test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -U postgres"], interval: 5s, timeout: 5s, retries: 30 }

  kafka:
    image: apache/kafka:3.8.0
    restart: unless-stopped
    environment:
      # KAFKA_* de um nó só em KRaft (listeners, controller, replication = 1): ver o docker-compose.yml; mais:
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk      # UUID base64 válido (22 chars)
      KAFKA_LOG_DIRS: /var/lib/kafka/data
      KAFKA_HEAP_OPTS: "-Xms256m -Xmx512m"
    volumes: [kafka-data:/var/lib/kafka/data]
    mem_limit: 768m
    healthcheck: { test: ["CMD-SHELL", "nc -z 127.0.0.1 9092"], interval: 10s, timeout: 5s, retries: 30, start_period: 20s }   # sem 2ª JVM

  connect:
    image: quay.io/debezium/connect:3.0.0.Final
    restart: unless-stopped
    environment:
      # BOOTSTRAP_SERVERS, GROUP_ID, *_STORAGE_TOPIC e os converters: ver o docker-compose.yml; mais:
      HEAP_OPTS: "-Xms256m -Xmx512m"
    mem_limit: 768m
    depends_on: { kafka: { condition: service_healthy }, postgres: { condition: service_healthy } }
    healthcheck: { test: ["CMD", "curl", "-fsS", "-o", "/dev/null", "http://localhost:8083/connectors"], interval: 10s, timeout: 5s, retries: 30 }

  connect-init:
    image: quay.io/debezium/connect:3.0.0.Final
    restart: "no"
    entrypoint: ["bash", "/registrar.sh"]
    environment:
      <<: *db-senhas
      CONNECT_URL: http://connect:8083
    volumes: ["./uzusis-api/infra/debezium/registrar-conectores.sh:/registrar.sh:ro"]
    mem_limit: 128m
    depends_on:
      connect: { condition: service_healthy }
      catalog-service: { condition: service_healthy }   # Flyway criou public.outbox (a publication filtrada exige)
      order-service: { condition: service_healthy }
      payment-service: { condition: service_healthy }

  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    restart: unless-stopped
    command: ["start-dev", "--import-realm"]
    environment:
      KC_BOOTSTRAP_ADMIN_USERNAME: ${KEYCLOAK_ADMIN:-admin}
      KC_BOOTSTRAP_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD:-admin}
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: postgres
      KC_DB_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      KC_HTTP_RELATIVE_PATH: /auth
      # URL completa, sem KC_HOSTNAME_BACKCHANNEL_DYNAMIC: todas as URLs do discovery (issuer, token, jwks,
      # userinfo) saem dela, e não da requisição; atrás de TLS na borda, PUBLIC_URL=https://... basta.
      KC_HOSTNAME: ${PUBLIC_URL:-http://localhost:${WEB_PORT:-8080}}/auth
      KC_PROXY_HEADERS: xforwarded
      KC_HEALTH_ENABLED: "true"
      JAVA_OPTS_KC_HEAP: "-Xms128m -Xmx512m"
      # placeholders do realm (redirect URIs e SMTP dos e-mails de cadastro/reset), lidos só no import
      PUBLIC_URL: ${PUBLIC_URL:-http://localhost:${WEB_PORT:-8080}}
      SMTP_HOST: ${SMTP_HOST:-mailpit}
      SMTP_PORT: ${SMTP_PORT:-1025}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASSWORD: ${SMTP_PASSWORD:-}
      SMTP_AUTH: ${SMTP_AUTH:-false}
      SMTP_STARTTLS: ${SMTP_STARTTLS:-false}
      SMTP_FROM: ${SMTP_FROM:-nao-responda@uzusis.local}
    volumes:
      - ./uzusis-api/infra/keycloak/import:/opt/keycloak/data/import:ro
      - ./uzusis-api/infra/keycloak/themes/uzusis:/opt/keycloak/themes/uzusis:ro
    mem_limit: 1g
    depends_on: { postgres: { condition: service_healthy } }
    healthcheck:
      test: ["CMD", "bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/9000 && printf 'GET /auth/health/ready HTTP/1.0\\r\\n\\r\\n' >&3 && grep -q UP <&3"]
      interval: 10s
      timeout: 5s
      retries: 30
      start_period: 40s

  minio:
    image: pgsty/minio:RELEASE.2026-08-04T00-00-00Z
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-uzusis}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-uzusis-minio-dev}
    volumes: [fotos-data:/data]
    mem_limit: 256m
    healthcheck: { test: ["CMD", "mc", "ready", "local"], interval: 5s, timeout: 5s, retries: 30 }

  # "download" anônimo também libera ListBucket; quem fecha a listagem é o nginx (§8.2)
  minio-init:
    image: pgsty/minio:RELEASE.2026-08-04T00-00-00Z
    restart: "no"
    entrypoint: ["sh", "-c"]
    command:
      - >
        mc alias set local http://minio:9000 "$$MINIO_ROOT_USER" "$$MINIO_ROOT_PASSWORD" &&
        mc mb --ignore-existing "local/$$MINIO_BUCKET" &&
        mc anonymous set download "local/$$MINIO_BUCKET"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-uzusis}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-uzusis-minio-dev}
      MINIO_BUCKET: ${MINIO_BUCKET:-produtos}
    mem_limit: 64m
    depends_on: { minio: { condition: service_healthy } }

  mailpit:
    image: axllent/mailpit:latest
    restart: unless-stopped
    ports: ["127.0.0.1:${MAILPIT_PORT:-8025}:8025"]
    mem_limit: 64m

  jaeger:
    image: jaegertracing/all-in-one:1.62.0
    profiles: [observability]
    environment: { COLLECTOR_OTLP_ENABLED: "true", MEMORY_MAX_TRACES: "5000" }
    ports: ["127.0.0.1:16686:16686"]
    mem_limit: 256m

  stripe-cli:
    image: stripe/stripe-cli:latest
    profiles: [stripe]
    restart: unless-stopped   # volta sozinho; enquanto estiver fora, a reconciliação de 2 min confirma os pagamentos
    command: ["listen", "--api-key", "${STRIPE_SECRET_KEY:-}", "--forward-to", "http://web/api/webhooks/stripe",
              "--events", "payment_intent.succeeded,payment_intent.payment_failed"]
    mem_limit: 128m
    depends_on: { web: { condition: service_started } }

volumes:
  pg-data:
  kafka-data:
  fotos-data:     # uzusis_minio-data e uzusis_db-data (antigos) ficam fora do compose
```

**`uzusis-api/Dockerfile`** (build único):
- `# syntax=docker/dockerfile:1`
- estágio `maven:3.9-eclipse-temurin-21`:
  `COPY . .` → `RUN --mount=type=cache,target=/root/.m2 MAVEN_OPTS=-Xmx1g mvn -B -q -Dmaven.test.skip=true package`
  → para cada um dos 6 módulos:
  `java -Djarmode=tools -jar <mod>/target/<mod>-*.jar extract --force --destination /out --libraries lib --application-filename <mod>.jar`
  (`--force` porque, a partir do 2º módulo, `/out` já não está vazio).
  Os 6 compartilham `/out/lib` (mesmas versões pelo BOM; se alguma diferir, os dois arquivos coexistem e cada
  manifesto aponta o seu). O `common` vira um jar em `lib/`;
- runtime `eclipse-temurin:21-jre-alpine`: usuário não-root `app`, `COPY --from=build /out/ /app/`, `ENV MODULO=gateway`,
  `ENTRYPOINT ["sh","-c","exec java -jar /app/${MODULO}.jar"]`.
- Sem `EXPOSE`.
- `uzusis-api/.dockerignore`: `**/target`, `.env`, `.git`.

**`uzusis-front/Dockerfile`**:
- `node:22-alpine` (o Angular 22 exige Node `^22.22.3 || ^24.15`): `npm ci --no-audit --no-fund` (**sem**
  `--legacy-peer-deps`) → `NODE_OPTIONS=--max-old-space-size=2048 npx ng build --configuration production`. O
  `COPY . .` leva o `libs/ui` (helm) junto;
- `nginx:alpine`: `COPY nginx.conf /etc/nginx/conf.d/default.conf` e
  `COPY --from=build /app/dist/uzusis/browser /usr/share/nginx/html` (o builder `application` grava em `browser/`).
- `uzusis-front/.dockerignore`: `node_modules`, `dist`, `.angular`, `.git`.

**`registrar-conectores.sh`**:
- `set -euo pipefail`;
- espera até `curl -fsS $CONNECT_URL/connectors` responder (120 × 2 s);
- para `catalog/catalog`, `order/orders` e `payment/payments`:
  - monta o JSON a partir de um heredoc **com aspas** (`<<'EOF'`, sem expansão de shell), trocando
    `__SERVICO__`, `__DB__`, `__USUARIO__` e `__SENHA__` por `sed`. A senha vem de `<DATABASE>_DB_PASSWORD`
    (padrão = o nome do database), escapada para o JSON e para o `sed`;
  - o valor literal fica `"transforms.outbox.route.topic.replacement": "${routedByValue}"`;
  - adiciona `"publication.autocreate.mode": "filtered"`, `"heartbeat.interval.ms": "10000"` (o slot de um
    database parado continua avançando e não segura WAL, R10) e `"snapshot.mode": "when_needed"` (se a posição salva
    sumiu, com o slot recriado, o conector refaz o snapshot da outbox em vez de pular o que ficou para trás);
  - `curl -fsS -X PUT …/connectors/outbox-<svc>/config`;
- depois espera `…/status` com o connector **e** a task 0 em `RUNNING` (60 s). A imagem não tem `jq`: a checagem é
  com `grep -o '"state":"RUNNING"' | wc -l` = 2;
- task em `FAILED` (ex.: o `postgres` foi recriado e a task perdeu o host) → `POST …/connectors/outbox-<svc>/restart?includeTasks=true&onlyFailed=true`
  e continua esperando; só depois dos 60 s sem `RUNNING` imprime o status e `exit 1` (re-`PUT` da mesma config não
  reinicia task falhada);
- **sem conector `notification`**;
- `DRY_RUN=1` só imprime os 3 JSONs, um por linha, e sai. `testar-registrar.sh` (ao lado) usa o `DRY_RUN` com uma
  senha cheia de caracteres especiais e confere a senha no JSON e o `snapshot.mode`.

### 8.2 `uzusis-front/nginx.conf`
```nginx
# Atrás de um proxy TLS na borda, repassa o esquema e o host que ele recebeu; sem
# ele (dev), os desta conexão. As URLs do Keycloak vêm de KC_HOSTNAME de qualquer jeito.
map $http_x_forwarded_proto $fwd_proto { default $http_x_forwarded_proto; "" $scheme; }
map $http_x_forwarded_host  $fwd_host  { default $http_x_forwarded_host;  "" $http_host; }

server {
  listen 80;
  server_name _;
  server_tokens off;
  root /usr/share/nginx/html;
  client_max_body_size 8m;                 # upload até 5 MB; 5–8 MB → o backend responde 413 em pt-BR
  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml;
  resolver 127.0.0.11 valid=10s ipv6=off;  # DNS do Docker por requisição: sobe sem upstream e sobrevive a recriação
  set $gateway  http://gateway:8080;
  set $keycloak http://keycloak:8080;
  set $minio    http://minio:9000;

  location ^~ /api/ {                      # ^~ impede que as regex de cache capturem
    proxy_pass $gateway;                   # variável sem URI → repassa /api/... intacto
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-For $remote_addr;   # não confia no do cliente (ver /auth/)
    proxy_set_header X-Forwarded-Proto $fwd_proto;
  }
  location ^~ /auth/ {
    proxy_pass $keycloak;
    proxy_set_header Host $http_host;               # $http_host mantém a porta (8080/8088)
    proxy_set_header X-Forwarded-Host $fwd_host;
    proxy_set_header X-Forwarded-Proto $fwd_proto;
    # O nginx é a borda: o IP é o da conexão, não o X-Forwarded-For que o cliente mandou
    # (o Keycloak registra o primeiro da lista). Atrás de outro proxy, ative no server:
    #   set_real_ip_from <IP do proxy>; real_ip_header X-Forwarded-For;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_buffer_size 128k; proxy_buffers 4 256k; proxy_busy_buffers_size 256k;
  }
  location ^~ /storage/ {                  # só objeto: listar o bucket (GET /storage/produtos/) dá 404
    location ~ ^/storage/[^/]+/.+\.(jpg|png|webp)$ {   # regex aninhada é avaliada mesmo sob ^~
      limit_except GET HEAD { deny all; }
      rewrite ^/storage/(.*)$ /$1 break;
      proxy_pass $minio;
      expires 7d;
      add_header X-Content-Type-Options nosniff always;
    }
    return 404;
  }
  # arquivos com hash do builder application: main-XXXXXXXX.js, chunk-Xx_x-xXx.js, media/... (entre aspas: regex com chaves)
  location ~ "^/(?:(?:main|polyfills|styles|chunk)-[A-Za-z0-9_-]{8}\.(?:js|css)|media/.+-[A-Za-z0-9_-]{8}\.\w+)$" {
    expires max; add_header Cache-Control "public, immutable"; try_files $uri =404;
  }
  location /assets/ { expires 7d; try_files $uri =404; }
  location / {
    add_header Cache-Control "no-cache";
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-Frame-Options SAMEORIGIN always;
    try_files $uri $uri/ /index.html;
  }
}
```
O hash do builder `application` tem 8 caracteres base64url, não hex: com a regex antiga os chunks cairiam em `location /`,
e um chunk inexistente depois de um deploy voltaria como `index.html` com 200 (erro de MIME); com esta, 404.
Os cabeçalhos de segurança ficam só no SPA (e o `nosniff` nas fotos). O Keycloak manda os dele, e repetir geraria duplicatas.
O `X-Forwarded-For` é sempre `$remote_addr`: com `$proxy_add_x_forwarded_for`, o cliente forjaria o IP que o Keycloak
registra (brute force, eventos). Os `X-Forwarded-Proto`/`-Host` do cliente passam adiante, mas o Keycloak monta todas
as URLs do discovery a partir de `KC_HOSTNAME` (§8.1): conferido que, com `X-Forwarded-Proto: https` e
`X-Forwarded-Host: evil.test` forjados, o issuer e os endpoints continuam sob `${PUBLIC_URL}/auth/realms/uzusis`.
O `mc anonymous set download` do bucket também libera `s3:ListBucket`. Quem fecha a listagem é o nginx: o MinIO
não é publicado, então `/storage` é o único caminho até ele.

### 8.3 Keycloak (`uzusis-api/infra/keycloak/import/uzusis-realm.json`)
O arquivo sai de `infra/keycloak/uzusis-realm.json`, porque o tema passa a morar ao lado e o import só deve ver JSON.

Configuração do realm:
- **Flags**:
  - `registrationAllowed: true`, `registrationEmailAsUsername: true`, `verifyEmail: true`, `resetPasswordAllowed: true`;
  - `loginWithEmailAllowed: true`, `duplicateEmailsAllowed: false`, `rememberMe: true`;
  - `bruteForceProtected: true` (`failureFactor: 10`);
  - `passwordPolicy: "length(8) and notUsername and notEmail"`;
  - `accessTokenLifespan: 900`, `sslRequired: "none"`;
  - `ssoSessionIdleTimeout: 7200` (o padrão de 30 min deslogaria quem deixa a loja aberta),
    `ssoSessionIdleTimeoutRememberMe: 2592000`, `ssoSessionMaxLifespanRememberMe: 2592000`.
- **Idioma**: `internationalizationEnabled: true`, `supportedLocales: ["pt-BR"]`, `defaultLocale: "pt-BR"`.
- **Aparência**: `loginTheme: "uzusis"`, `emailTheme: "uzusis"`, `displayName: "Uzusis"`,
  `displayNameHtml: "<span class=\"uz-logo\">UZUSIS</span>"`.
- **SMTP** por placeholders do ambiente do contêiner (§2.4), com padrão no Mailpit:
  `smtpServer: {"host":"${SMTP_HOST:mailpit}","port":"${SMTP_PORT:1025}","from":"${SMTP_FROM:nao-responda@uzusis.local}","fromDisplayName":"Uzusis","auth":"${SMTP_AUTH:false}","user":"${SMTP_USER:}","password":"${SMTP_PASSWORD:}","ssl":"false","starttls":"${SMTP_STARTTLS:false}"}`.
  Como os `${PUBLIC_URL}`, só valem no import: depois, Realm settings → Email no console, ou reimportar.
- **Papéis**:
  - `ADMIN` e `CUSTOMER`;
  - `offline_access` e `uma_authorization` declarados explicitamente em `roles.realm`: sem eles, o import do KC
    26.0.8 falha com *"Unable to find composite realm role: uma_authorization"*;
  - `default-roles-uzusis` declarado em `roles.realm` com `composite: true` e
    `composites: {"realm": ["offline_access","uma_authorization","CUSTOMER"]}`, mais `defaultRole` apontando para ele.
    Assim o autocadastro ganha `CUSTOMER`.
- **Clients**:
  - `web-app`: público, `standardFlowEnabled`, `directAccessGrantsEnabled: false`;
    - `redirectUris: ["${PUBLIC_URL}/*","http://localhost:4200/*"]`;
    - `webOrigins: ["${PUBLIC_URL}","http://localhost:4200"]`;
    - `attributes: {"pkce.code.challenge.method":"S256","post.logout.redirect.uris":"+"}`;
    - os placeholders `${PUBLIC_URL}` vêm do ambiente do contêiner.
  - `mobile-app` fica como está.
  - **Remover** o client `order-service`.
  - `admin-cli` **declarado**: público, `directAccessGrantsEnabled: true`, `standardFlowEnabled: false`. O e2e e o
    seed pedem token por password grant nele. O `admin-cli` que o Keycloak cria sozinho num realm importado vem
    **sem** client scopes padrão, e o token sairia sem `email`, `name` e `realm_access` (quebraria o passo 1 do e2e,
    os papéis e o `email` que o O6 exige). Fora de dev, desligar o direct grant dele (README, "Fora de dev").
  - Não declarar client scopes: o import cria os padrões (profile, email, roles, web-origins, acr, basic), e os
    clients declarados os recebem; o token traz `email`, `name` e `realm_access.roles`. O e2e confere.
- **Usuários** (iguais aos de hoje, com `emailVerified: true`, **sem** `id` fixo):
  - `admin@uzusis.local` / `admin123` com `ADMIN`, `CUSTOMER`;
  - `cliente@uzusis.local` / `cliente123` com `CUSTOMER`.
  - Só dev (o e2e e o seed usam). Fora de dev, trocar ou apagar (README, "Fora de dev").

`--import-realm` só importa quando o realm não existe. Os `${PUBLIC_URL}` de `redirectUris` e `webOrigins` (e os
`${SMTP_*}`) ficam **congelados** no primeiro boot. Trocar `PUBLIC_URL` ou `WEB_PORT` depois disso dá "Invalid redirect uri" no login,
e o e2e não percebe, porque usa password grant. Por isso **toda troca de `PUBLIC_URL`/`WEB_PORT` exige reimportar o
realm**, e também uma mudança no `uzusis-realm.json`. Isso também vale para um primeiro `up` que falhou no bind da 8080
depois de o Keycloak já ter importado. Para reimportar **sem** perder fotos nem pedidos:
`docker compose stop keycloak && docker compose exec postgres psql -U postgres -c 'DROP DATABASE keycloak WITH (FORCE)' -c 'CREATE DATABASE keycloak' && docker compose up -d keycloak`.
O reimport apaga **todos** os usuários do realm: os criados pelo cadastro somem, e `admin@`/`cliente@` voltam com um
**`sub` novo** (o arquivo não fixa `id`). Pedidos, sacola e perfil ficam no banco, mas presos ao `sub` antigo: não são
mais de ninguém (somem de "Minha conta"; o admin ainda vê os pedidos em O10), e a conta recriada começa vazia. O README avisa.
O realm vivo da verificação (8088) **não** foi reimportado depois da última mudança do arquivo (Estado final, no topo).

**Tema de login** em `uzusis-api/infra/keycloak/themes/uzusis/login/`. Só CSS e imagem, sem SPI.
- `theme.properties`: `parent=keycloak`, `import=common/keycloak`, `styles=css/login.css css/uzusis.css`, `locales=pt-BR`.
- `resources/css/uzusis.css`:
  - `@import` Google Fonts (Scope One, Inter);
  - fundo `#faf8f5`;
  - cartão branco com raio 8px e borda `#e6e0da`;
  - título e `.uz-logo` em Scope One, cor `#292b2e`, `letter-spacing .2em`;
  - botão primário `#7a5a41` (hover `#654a35`, texto branco);
  - links `#7a5a41`;
  - inputs com borda `#8f877f` e foco `outline 2px #7a5a41`;
  - responsivo em 390px.
- `resources/img/logo.png`: cópia de `uzusis-front/src/assets/logoUzu.png`, exibida acima do título.
- `messages/messages_pt_BR.properties`: `loginAccountTitle=Entrar na Uzusis` e `registerTitle=Criar sua conta`.

**Tema de e-mail** em `uzusis-api/infra/keycloak/themes/uzusis/email/`. Só mensagens, sem FTL (o tema `keycloak`
de e-mail do 26.0.8 herda de `base`, que já tem `messages_pt_BR.properties`; conferido no jar).
- `theme.properties`: `parent=keycloak`, `locales=pt-BR`.
- `messages/messages_pt_BR.properties` sobrescreve `emailVerificationSubject`, `emailVerificationBodyHtml`,
  `passwordResetSubject` e `passwordResetBodyHtml`. O texto é da marca ("Uzusis — feita de irmãs para as nossas
  Sis"), e os **placeholders do original** (`{0}` link, `{2}` nome do realm, `{3}` validade) são mantidos.

### 8.4 Stripe
- **Real, em dev** (depois que o usuário tiver as chaves):
  1. `STRIPE_SECRET_KEY=sk_test_…` e `STRIPE_PUBLISHABLE_KEY=pk_test_…` no `.env`.
  2. Obter o segredo do stripe-cli: `docker compose run --rm --no-deps stripe-cli listen --api-key sk_test_… --print-secret`
     → `whsec_…` (o `run` de um serviço nomeado liga o profile dele; sem `--no-deps` ele recriaria o `web`, do
     qual depende). O segredo é fixo por conta: basta pegar uma vez.
  3. No `.env`: `STRIPE_WEBHOOK_SECRET=whsec_…` e `COMPOSE_PROFILES=stripe`, para o stripe-cli subir sempre junto,
     com `restart: unless-stopped`. Fora da 8080, também `WEB_PORT` e `PUBLIC_URL`: assim todo `docker compose …`
     usa a mesma porta, e um `up` sem as variáveis não troca a porta (o que exigiria reimportar o realm, §8.3).
  4. `docker compose up -d`.

  O README explica. Cartão de teste `4242 4242 4242 4242`; recusa com `4000 0000 0000 0002` → pedido `CANCELADO`
  e sacola restaurada.
- **Real, em produção**: sem stripe-cli. Cadastrar no Dashboard o endpoint `${PUBLIC_URL}/api/webhooks/stripe`
  (eventos `payment_intent.succeeded` e `payment_intent.payment_failed`) e usar o `whsec` dele.
- Sem stripe-cli nem endpoint cadastrado, os pagamentos só confirmam pela reconciliação (§6.4 item 9), com até
  cerca de 4 min de atraso, e nunca viram estorno por expiração.
- **E2E**: `docker-compose.e2e.yml` (override; o Stripe falso **não** entra no produto):
  ```yaml
  services:
    stripe-mock:
      image: stripe/stripe-mock:latest
      restart: unless-stopped
      mem_limit: 64m
    payment-service:
      environment:
        STRIPE_SECRET_KEY: sk_test_e2emock   # o stripe-mock recusa chave com mais de 3 partes (sk_test_x_y → 401)
        STRIPE_PUBLISHABLE_KEY: pk_test_e2emock
        STRIPE_WEBHOOK_SECRET: ${E2E_WEBHOOK_SECRET:-whsec_e2e_uzusis_local}
        STRIPE_API_BASE: http://stripe-mock:12111
      depends_on:
        stripe-mock: { condition: service_started }
  ```

### 8.5 `scripts/e2e-compra.sh`
bash + curl + jq + openssl, rodando no host.

Variáveis:
- `BASE_URL` (padrão `${PUBLIC_URL:-http://localhost:8080}`)
- `MAILPIT_URL` (padrão `http://localhost:${MAILPIT_PORT:-8025}`)
- `E2E_WEBHOOK_SECRET` (padrão `whsec_e2e_uzusis_local`)
- `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` (padrão `admin/admin`)

Imprime `✔ passo` e termina com `E2E OK` (exit 0). Na primeira falha, imprime o passo, a resposta e `exit 1`.
Toda espera é um polling com timeout explícito. O script faz `cd` para a raiz do repositório (usa `docker compose exec`).
`trap … EXIT`: se o produto E2E foi criado e ainda não foi excluído, faz `DELETE /api/produtos/{id}` e esvazia a
sacola do cliente. Assim uma falha no meio não deixa lixo na vitrine.

0. **Pronto**:
   - até 300 s por `GET /api/produtos` 200 e `GET /api/pagamentos/config` com `habilitado:true` (o override ativo).
   - Token do realm master (`admin-cli`, `KEYCLOAK_ADMIN`) → `GET /auth/admin/realms/uzusis/roles/default-roles-uzusis/composites/realm`
     contém `CUSTOMER`. `GET /auth/admin/realms/uzusis` tem `verifyEmail:true`, `registrationAllowed:true`,
     `resetPasswordAllowed:true`, `defaultLocale=="pt-BR"`, `loginTheme=="uzusis"`, `emailTheme=="uzusis"`,
     `passwordPolicy` não vazio e `smtpServer.host == "mailpit"`.
1. **Tokens** pelo `POST $BASE_URL/auth/realms/uzusis/protocol/openid-connect/token` com
   `grant_type=password&client_id=admin-cli&username=…&password=…`, para o admin e para o cliente.
   Decodificar o payload: `iss == $BASE_URL/auth/realms/uzusis`, o cliente tem o claim `email` e `realm_access.roles`
   contém `CUSTOMER`, o admin contém `ADMIN`.
2. **Segurança**:
   - anônimo `GET /api/pedidos` → 401; anônimo `POST /api/produtos` → 401; anônimo `GET /api/produtos/admin` → 401
     (não 500: prova o relançamento do advice, §4.0);
   - cliente `POST /api/produtos` → 403; cliente `GET /api/pedidos/admin` → 403; cliente `GET /api/pedidos/999999999` → 404;
   - webhook com assinatura errada → 400; webhook com corpo `nao-json` → 400 (não 500).
3. **Produto (admin)**:
   - `POST /api/produtos` `{nome:"E2E Blusa <ts>", preco:59.90, categoria:"BLUSA", tamanhos:[{M:10},{P:2}]}` → 201; guardar o id;
   - `POST …/fotos` com um PNG 1×1 gerado (base64 → arquivo) → 201;
   - `GET $BASE_URL<url>` → 200 e `Content-Type: image/png`;
   - `GET $BASE_URL/storage/produtos/` (listagem do bucket) → 404;
   - texto enviado como `x.png` → 415;
   - arquivo de 7 MB (`head -c 7340032 /dev/zero`) → 413 com `detail == "Arquivo maior que 5 MB."` (prova o
     `max-swallow-size`; sem ele, reset ou 502).
4. **Sacola (cliente)**: esvaziar (O1 + O4); O2 `{sigla:"M", quantidade:2}` → 201; O5 `uf=CE` → `valor == 10.0`.
5. **Pedido**: O6 com um endereço válido em CE → 201, `status CRIADO`, `subtotal 119.8`, `frete 10.0`, `valorTotal 129.8`.
   O1 → sacola vazia.
6. **Saga ida**:
   - polling de P2 até 200 (60 s) → `paymentIntentId`;
   - polling de `GET /api/produtos/{id}` até o tamanho M ter `quantidade == 8` (**estoque decrementado**).
7. **Webhook de sucesso** (função `webhook <tipo> <pi> <valor>`, reusada abaixo):
   - payload `{"id":"evt_e2e_<ts>_<n>","object":"event","type":"payment_intent.succeeded","created":<t>,"livemode":false,"data":{"object":{"id":"<pi>","object":"payment_intent","latest_charge":"ch_e2e_<ts>","amount":12980,"currency":"brl"}}}`;
   - `Stripe-Signature: t=<t>,v1=<hex(HMAC_SHA256(secret, "<t>.<payload>"))>`, calculado com
     `printf '%s.%s' "$t" "$payload" | openssl dgst -sha256 -hmac "$secret" -hex | awk '{print $NF}'`
     (o OpenSSL 3 imprime `SHA2-256(stdin)= <hex>`);
   - `POST /api/webhooks/stripe` → 200.
8. **PAGO**: polling O8 até `status == PAGO` (60 s), com `pagoEm` preenchido. O10 (admin, `status=PAGO`,
   `sort=pagoEm,desc&size=100`: cada execução deixa pedidos `PAGO`, e com o padrão o novo sairia da 1ª página) contém o
   pedido, com `endereco.numero` e `cliente.email`.
9. **E-mail**: polling em `GET $MAILPIT_URL/api/v1/messages?limit=100` até existir um `Subject` com `#<id>` e
   `confirmado` (60 s).
10. **Envio e recebimento**: O11 (admin) → `ENVIADO` + e-mail `enviado`; O9 (cliente) → `RECEBIDO`.
11. **Caminho de falha**:
    - O2 `{M, 1}` → O6 (pedido 2) → P2 → `pi2`; estoque M == 7;
    - **um pedido aguardando pagamento por cliente**: O2 `{M, 1}` → O6 → 409 `Você já tem um pedido aguardando
      pagamento.`, e a sacola continua com 1 item; depois esvazia a sacola;
    - webhook `payment_intent.payment_failed` com `last_payment_error.message: "Your card was declined."` → polling
      até `CANCELADO`, com `motivoCancelamento == "Pagamento recusado"` (o texto da Stripe não vaza) e
      `sacolaRestaurada == true`;
    - polling até o estoque M voltar a **8**;
    - e-mail com `#<id2>` e `cancelado`;
    - O1 contém o item de volta (sacola restaurada).
    - **Nunca cobrar pedido cancelado**: P2 do pedido 2 → 409 `Pagamento indisponível: pedido cancelado`. Depois,
      webhook `payment_intent.succeeded` assinado para o `pi2` → 200; o pedido 2 continua `CANCELADO` (O8, 10 s) e
      `docker compose exec -T postgres psql -U payments -d payments -tAc "select status from pagamento where order_id=<id2>"`
      chega a `ESTORNADO` (polling de 30 s). Isso exercita a chave `refund-order-{id}-{criadoEm}` no stripe-mock.
12. **Dados para as telas**: esvaziar a sacola e, repetindo os passos 4–8 com 1 unidade de M, deixar os pedidos 3 e
    4 em `PAGO` e o pedido 5 em `ENVIADO` (O11). O revisor de UI (§11.7) consome um `PAGO` e o `ENVIADO`. Estoque M == 5.
13. **Limpeza**:
    - `DELETE /api/produtos/{id}` → 204;
    - anônimo `GET /api/produtos/{id}` → 404;
    - C4 com `nome=E2E` mostra `ativo:false`;
    - a sacola do cliente está vazia.

`scripts/seed-dev.sh`:
- token de admin via `admin-cli`;
- cria cerca de 12 produtos de exemplo em categorias variadas, com estoque PP–GG, pulando os que já existem por nome em C4;
- 1 ou 2 fotos PNG 600×800 geradas com `python3` stdlib (zlib + struct, cores da paleta);
- serve para ter uma vitrine com cara de loja nos screenshots.

---

## 9. Segurança

**Falhas do .NET que não podem voltar** (auditoria `map-dotnet` §8):
1. Criação de admin anônima (`POST /administradorauth/adicionar`). Aqui: admin só pelo Keycloak (papel `ADMIN`) e
   nenhum endpoint cria usuário.
2. Reset de senha sem conferir o código, e código reutilizável. Aqui: reset só pelo Keycloak.
3. Cadastro sem e-mail confirmado. Aqui: `verifyEmail: true`.
4. Endpoints `[AllowAnonymous]` que agem pelo id do token, e o id numérico de admin colidindo com o de cliente. Aqui:
   o dono é sempre o `sub` do token, e nenhum endpoint recebe id de usuário para agir sobre "si".
5. Hash de senha na resposta. Aqui: não existe senha no nosso código.
6. Troca de senha sem a senha atual. Aqui: `kc_action=UPDATE_PASSWORD` no Keycloak.
7. Enumeração de usuário e códigos de 5 hex sem limite. Aqui: brute force do Keycloak + política de senha.
8. CORS `*` e `iss` sem validação. Aqui: mesma origem, sem CORS, e `iss` validado em todo serviço.
9. Upload sem validar tipo e tamanho, com o objeto órfão em caso de falha. Aqui: §4.2 C10.
10. `console.log` do token no front (`navbar.service.ts:86`). Aqui: proibido.

**Regras**:
- **IDOR**: todo recurso de cliente é buscado por `(id, sub)`. Se não for dele → **404**. Testado em O8, O9, O3 e
  O4 (`PedidoControllerSecurityTest` e `PedidoServiceBancoTest`) e em P2 (`PagamentoControllerSecurityTest`), além
  do passo 2 do e2e.
- **Papéis**: só `realm_access.roles` (`KeycloakRoleConverter`). O gateway **e** o serviço validam o JWT, e só
  aceitam access token (`typ = Bearer`; o ID token dá 401, §4.0).
  `@PreAuthorize("hasRole('ADMIN')")` em C4, C6–C12, O10–O12 e I4, com a negação chegando ao cliente como 401/403,
  nunca 500 (§4.0). As rotas públicas são só as de §4.6.
- **Upload**:
  - bytes mágicos, 5 MB, 6 fotos por produto;
  - chave gerada no servidor (UUID), content-type do tipo detectado;
  - o bucket tem `download` anônimo, que no MinIO inclui listar; o nginx só encaminha GET/HEAD de objeto
    (`/storage/<bucket>/<chave>.(jpg|png|webp)`), com `nosniff`, e o resto de `/storage` dá 404.
- **Webhook**:
  - a assinatura é obrigatória, com tolerância de 300 s;
  - segredo vazio → 503; corpo malformado → 400;
  - deduplicação pelo `event.id`;
  - intent desconhecido é ignorado.
  - O Stripe **nunca** confirma pagamento pelo front: só o webhook, ou a reconciliação, marca PAGO.
  - Pagamento que chega para pedido cancelado é estornado na hora (§6.4 item 6), e o front não permite uma 2ª
    tentativa no mesmo intent (§7.3).
- **Dinheiro**: o valor cobrado é calculado no servidor: itens com o preço **do catálogo no O6** + frete do servidor.
  O cliente não manda preço nem frete.
- **Estoque**: um pedido `CRIADO` por cliente (O6 → 409). Sem isso, uma conta reservaria todo o estoque da loja,
  30 min por vez, repetindo o O6 a cada expiração.
- **Segredos**:
  - `.env` no `.gitignore`;
  - `.env.example` com as chaves Stripe **vazias**;
  - nenhuma chave no build do front (a publishable key vem de P1);
  - o secret do client `order-service` sai do realm.
  - as senhas dos usuários de database vêm de `*_DB_PASSWORD` (padrão = o nome do database; o `init.sql` lê do
    ambiente, os serviços e o registrar do Debezium também). Aceito para dev, porque o Postgres não é publicado. O
    README ("Fora de dev") diz o que trocar antes do primeiro `up` e como trocar depois (`ALTER USER`, console);
  - os usuários de teste do realm têm senha pública: por isso o `web` publica em `127.0.0.1` por padrão
    (`WEB_BIND`), e o README manda trocá-los ou apagá-los fora de dev.
- **Superfície**:
  - só `web` e o Mailpit publicam portas, os dois em 127.0.0.1 (o `web` abre para a rede com `WEB_BIND=0.0.0.0`);
  - o nginx manda `X-Forwarded-For $remote_addr` (o cliente não forja o IP que o Keycloak registra, §8.2);
  - o nginx não encaminha `/actuator`;
  - o console de admin do Keycloak fica em `/auth/admin`. O README manda trocar `KEYCLOAK_ADMIN_PASSWORD` fora de dev.
- **XSS**: o Angular escapa; nada de `innerHTML` com dado da API. E-mails com `htmlEscape`.

---

## 10. Plano de execução

Registro do plano da migração (fases 1–5). A troca do front para Angular 22 + helm seguiu as mesmas regras de posse,
de `flock` e de git, com os comandos `npm`/`ng` no contêiner `node:22-alpine` (§11).

### Posse de caminhos (quem **escreve**; qualquer um lê)
| Agente | Caminhos |
|---|---|
| **(a) infra + gateway** | `docker-compose.yml`, `docker-compose.e2e.yml`, `.env.example`, `.gitignore` (raiz), `README.md`, `scripts/**`, `uzusis-api/Dockerfile`, `uzusis-api/.dockerignore`, `uzusis-api/README.md`, `uzusis-api/gateway/**`, `uzusis-api/infra/**` (realm, tema, debezium, postgres); `uzusis-front/Dockerfile`, `uzusis-front/nginx.conf`, `uzusis-front/.dockerignore` |
| **(b) catalog** | `uzusis-api/catalog-service/**` |
| **(c) order + common** | `uzusis-api/pom.xml`, `uzusis-api/common/**`, `uzusis-api/order-service/**` |
| **(d) payment** | `uzusis-api/payment-service/**` |
| **(e) identity + notification** | `uzusis-api/identity-service/**`, `uzusis-api/notification-service/**` |
| **(f) front fundação** | `uzusis-front/` **menos** `Dockerfile`, `nginx.conf`, `.dockerignore` e `src/app/features/{vitrine,checkout,conta,admin}/**` depois do esqueleto |
| **(g) vitrine** | `uzusis-front/src/app/features/vitrine/**` |
| **(h) checkout** | `uzusis-front/src/app/features/checkout/**` |
| **(i) conta** | `uzusis-front/src/app/features/conta/**` |
| **(j) admin** | `uzusis-front/src/app/features/admin/**` |

Regras:
- Ninguém edita fora da sua posse. Se faltar algo em `core`, `shared` ou `common`, implementa localmente na
  feature ou no módulo, e registra no relatório final para a integração.
- Só (f) roda `npm install` e mexe no lock.
- Só (c) instala o `common` e o pom pai no `~/.m2`.
- Os outros módulos Java compilam **sem `-am`**: `mvn -f uzusis-api/pom.xml -B -pl <modulo> verify`.
  Rebuilds paralelos do `common/target` corrompem.
- **Um build por vez na máquina**: todo `mvn`, `npm` e `ng build`/`ng test` roda como
  `flock /tmp/uzusis-build.lock <comando>` (o mesmo arquivo para todos os agentes; o scratchpad é de cada um e não
  serve). Há 3,4 GB livres, e um `mvn verify` com Testcontainers (cerca de 1 GB) mais um `ng build` (cerca de 2 GB)
  não cabem juntos. O Maven 3.8.7 do host também não protege o `~/.m2` contra escrita concorrente, e os `ng build`
  compartilhariam `uzusis-front/.angular/cache`. Editar e ler código continua em paralelo.
- Os builds de front das features usam saída própria: `ng build --configuration development --output-path <saída>`,
  no contêiner e sob o mesmo `flock`.
  O `ng build` compila o app inteiro: **erro de compilação fora do próprio diretório** (feature de outro agente pela
  metade) não bloqueia nem é corrigido por quem o viu. Repita o build depois. Os testes rodam no fim, pela integração.
- Ninguém usa `ng serve` para validar (a 8080 desta máquina é de outro projeto; §7.1).
- `docker compose build`/`up` só na fase 3. Na fase 1b, (a) roda só `docker compose config`.
- **Git**: nenhum agente roda comando que altere a árvore, o índice ou o HEAD (`stash`, `checkout`, `switch`,
  `reset`, `clean`, `restore`, `commit`, `rebase`, `merge`, `pull`). Só leitura: `status`, `diff`, `log`, `show`,
  `grep`. Os commits são feitos pela integração no fim, se o usuário pedir.
- Ninguém escreve em `SPEC.md`.
- Nunca parar contêineres de outros projetos, nunca `docker compose down -v`, nunca criar nem editar `.env`.

### Fases e dependências
| Fase | Quem | Depende de | Entrega (critério para fechar a fase) |
|---|---|---|---|
| **1a** | (c) só o `common` e o pom pai (§6.1) | — | `mvn -N install` + `-pl common install` verdes |
| **1b** (paralela a 1a) | (a) | — | compose, e2e, nginx, Dockerfiles, realm, temas de login e de e-mail, script Debezium (`DRY_RUN=1` gera JSON válido), gateway (`-pl gateway verify` verde), scripts e READMEs. `docker compose config -q` passa no default, com `--profile stripe`/`observability` e com `-f docker-compose.e2e.yml` |
| **1c** (paralela) | (f) | — | deps trocadas, tema e tokens, shell, auth, interceptor, todos os serviços e modelos de `core/api`, componentes de §7.4, esqueletos lazy e limpeza. `ng build` e `ng test` verdes |
| **2** | (b), (c) order, (d), (e) | 1a | cada um: `mvn -f uzusis-api/pom.xml -B -pl <modulo> verify` verde, com os testes de §6 |
| **2** | (g), (h), (i), (j) | 1c | build de desenvolvimento verde na saída própria; telas completas com todos os estados |
| **3 integração** | um agente, com posse total e sequencial | 1 e 2 | §11 inteiro verde (build do `web` antes do resto; reimport do realm se a porta mudar). Corrige quebras de contrato no dono lógico do arquivo, uma de cada vez |
| **4 revisão adversarial** | 3 revisores em paralelo, só leitura | 3 | (1) segurança: §9 linha a linha, tentar IDOR, papéis, upload malicioso e webhook forjado; (2) correção: saga, dinheiro, estoque, concorrência; (3) UI: screenshots (§11) contra §7, acessibilidade e mobile. Saída: lista de achados com arquivo:linha e severidade |
| **5 correções** | integração | 4 | corrige os achados altos e médios e roda §11 de novo |

Contratos cruzados (quebrar um derruba a integração):
- `ProdutoResposta` ↔ `ProdutoResumo` do order (`nome`, `preco`, `tamanhos[].id/sigla/quantidade`, `fotos[].url`;
  inativo = 404).
- `Events` (common) ↔ os consumidores (`OrderCancelled.sacolaRestaurada` ↔ notification; sem `RefundRequested`).
- `PedidoResposta.sacolaRestaurada` ↔ a confirmação do front e o e2e.
- C4 `disponivel` ↔ o painel e a lista de produtos do admin.
- `outputPath dist/uzusis` ↔ o Dockerfile do front.
- `web-app`, papéis e `/auth` ↔ `AuthConfig` do front.
- P1 e P2 ↔ o checkout.
- Os assuntos de e-mail e o motivo `Pagamento recusado` ↔ o e2e.
- `paymentIntentId` em P2 ↔ o e2e.
- `/api` com o prefixo mantido no nginx ↔ o `StripPrefix` do gateway.

---

## 11. Verificação e aceite final

Todos os comandos rodam a partir da raiz do repositório, com `env VAR=…`, que funciona em bash e em fish. Nesta máquina
a 8080 está ocupada, então use `WEB_PORT=8088 PUBLIC_URL=http://localhost:8088`; nas outras, o padrão.

```bash
# 1. Backend (precisa de Docker para o Testcontainers; postgres:16-alpine já é local)
mvn -f uzusis-api/pom.xml -B verify
test ! -e ~/.testcontainers.properties                     # nada gravado no home (D5)
grep -L 'locale-resolver: fixed' uzusis-api/{catalog,order,payment,identity,notification}-service/src/main/resources/application.yml   # vazio

# 2. Front, no Node 22 do contêiner (o Angular 22 não roda no Node 20 do host). Nesta máquina, com flock na frente
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -e npm_config_cache=/tmp/.npm -v "$HOME/.npm":/tmp/.npm \
  -v "$PWD/uzusis-front":/app -w /app node:22-alpine \
  sh -c 'npm ci --no-audit --no-fund && npx ng build && npx ng test --watch=false'   # dist/uzusis/browser; Vitest + jsdom

# 3. Compose válido em todas as combinações
docker compose config -q
docker compose --profile stripe --profile observability config -q
docker compose -f docker-compose.yml -f docker-compose.e2e.yml config -q
docker compose config --format json | jq -e '[.services[] | select(.mem_limit == null)] | length == 0'   # todo serviço padrão com limite
env DRY_RUN=1 bash uzusis-api/infra/debezium/registrar-conectores.sh | python3 -c 'import sys,json;[json.loads(l) for l in sys.stdin if l.strip()]'
bash -n scripts/*.sh

# 4. Stack padrão (sem chaves Stripe). Nesta máquina, o web primeiro (Maven + ng juntos não cabem na RAM)
env WEB_PORT=8088 PUBLIC_URL=http://localhost:8088 docker compose build web
env WEB_PORT=8088 PUBLIC_URL=http://localhost:8088 docker compose up -d --build
docker compose ps -a        # todos healthy/running; minio-init e connect-init "Exited (0)"; jaeger/stripe-* ausentes
docker compose ps --format '{{.Service}} {{.Ports}}' | grep -- '->'   # só web e mailpit
docker compose exec minio sh -c 'mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" && mc ls local/produtos'   # credenciais aceitas no volume de fotos (§2.3)
curl -fsS http://localhost:8088/api/pagamentos/config    # {"habilitado":false,"publishableKey":null}
curl -fsS http://localhost:8088/api/produtos             # Page JSON
curl -s -o /dev/null -w '%{http_code}' http://localhost:8088/storage/produtos/   # 404 (listagem fechada)
curl -fsS http://localhost:8088/auth/realms/uzusis/.well-known/openid-configuration | jq -r .issuer   # http://localhost:8088/auth/realms/uzusis
curl -fsS http://localhost:8088/                          # index.html
docker compose exec connect curl -fsS 'http://localhost:8083/connectors?expand=status'   # outbox-catalog/order/payment RUNNING

# 5. E2E (override com stripe-mock)
env WEB_PORT=8088 PUBLIC_URL=http://localhost:8088 docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --build
env BASE_URL=http://localhost:8088 bash scripts/e2e-compra.sh          # termina com "E2E OK"

# 6. Volta ao produto (sem override) e dados de vitrine
env WEB_PORT=8088 PUBLIC_URL=http://localhost:8088 docker compose up -d --remove-orphans
env BASE_URL=http://localhost:8088 bash scripts/seed-dev.sh
```

Se, ao final, o stack for ficar numa porta diferente da usada na verificação, a integração reimporta o realm (§8.3).

**7. UI no navegador** (revisor de UI):
- Um script Playwright no scratchpad, fora do repositório: `channel: 'chrome'`, que já está instalado, com
  Playwright 1.63 do cache npx ou Python 1.60.
- Viewports **1440×900** e **390×844**.
- **Fluxos clicados antes dos screenshots** (cada um falha o script se não completar):
  - (a) cadastro: "Criar conta" → formulário do Keycloak (tema Uzusis, pt-BR) com um e-mail novo → pegar o link de
    verificação na API do Mailpit → abrir → volta logado à loja → `/conta/dados` mostra o e-mail, e o access token
    (lido do `localStorage`) tem `CUSTOMER` em `realm_access.roles`;
  - (b) "Esqueci minha senha" no login → chega o e-mail de reset no Mailpit, com o texto da marca;
  - (c) cliente abre `/admin` → volta para `/` com o aviso "Acesso restrito à administração"; anônimo abre `/admin`
    → login do Keycloak (sem passar pela "Página não encontrada") → entra como admin e volta a `/admin`;
  - (d) anônimo escolhe o tamanho M em `/produto/:id` e clica "Adicionar à sacola" → login → volta com
    `?tamanho=M` pré-selecionado → adiciona; o badge da sacola incrementa; altera a quantidade no drawer;
  - (e) `/checkout` vem com o endereço do perfil pré-preenchido e, sem chaves, o botão desabilitado;
  - (f) admin cria um produto com foto **pela UI**, edita o estoque de um tamanho, desativa e reativa;
  - (g) admin marca como enviado um dos pedidos `PAGO` deixados pelo e2e; o cliente confirma o recebimento do
    pedido `ENVIADO`;
  - (h) busca (§7.3): no desktop, focar o campo pelo Tab não abre o popup e clicar abre; digitar um termo mostra
    "Produtos" com o termo em negrito, "Categorias" e "Ver todos os N resultados"; ↓/↑ movem o
    `aria-activedescendant` sem tirar o foco do campo; Enter abre o produto; Esc fecha e um 2º Esc limpa; um termo
    sem resultado mostra "Explore as categorias"; o termo buscado volta em "Buscas recentes". No celular, o ⌕ abre o
    diálogo "Buscar peças", e Esc fecha e devolve o foco ao ⌕. Axe sem violação séria com o popup e o diálogo abertos.
- **Screenshots** das páginas:
  - `/`, `/loja`, `/loja?categoria=BLUSA&ordem=menor-preco`, `/produto/:id`;
  - a sacola aberta e o popup da busca (inicial, com resultado, vazio);
  - `/checkout` (cliente logado, sem chaves: mostra "Pagamento ainda não configurado" e o botão desabilitado);
  - `/pedido/:id` de um pedido do e2e;
  - `/conta/pedidos` (um painel expandido) e `/conta/dados`;
  - `/admin`, `/admin/produtos`, `/admin/produtos/:id`, `/admin/pedidos` (com o pedido `PAGO` que sobrou),
    `/admin/pedidos/historico`;
  - `/nao-existe` (404);
  - do Keycloak: login, cadastro, "verifique seu e-mail" e reset de senha (tema).
- O login é feito pelo formulário do Keycloak com os usuários de teste.
- Em cada página do app o script confere:
  - `document.documentElement.scrollWidth <= innerWidth` (sem rolagem horizontal);
  - nenhum erro no console;
  - ausência de texto `undefined` ou `NaN`;
  - `document.title` não vazio e exatamente um `h1`;
  - `img` sem `alt` = 0, e campos (`input`, `select`, `textarea`, `button`, links, `role=option`/`combobox`) sem nome
    acessível = 0.

**Pronto** quando:
1. Os passos 1–6 passam sem intervenção manual.
2. `docker compose up -d --build` numa máquina com a 8080 livre sobe o sistema sem `.env`.
3. `E2E OK`.
4. Os fluxos (a)–(h) passam, e os screenshots das 16+ telas × 2 viewports batem com §7: tokens, estados, mobile e
   o tema do Keycloak.
5. Os revisores da fase 4 fecham sem achados altos abertos.
6. Estas checagens passam (as buscas voltam vazias; `--untracked` porque os arquivos novos só são commitados no fim):
   - `git grep --untracked -nE '@angular/material|@angular/animations|\bmat-[a-z]|\bMat[A-Z]|MAT_|karma|jasmine|--uz-' -- uzusis-front/src uzusis-front/libs uzusis-front/angular.json uzusis-front/package.json`
   - `git grep --untracked -nE '@ng-bootstrap|bootstrap\.min|bootstrap/scss|primeng|sweetalert|ngb-|ngx-mask|"moment"|swiper|ng-otp-input|@popperjs|@angular/localize|Poppins|Roboto|Exo\+2|Rubik|font-awesome|Material\+Icons|clienteauth|administradorauth|/api/produto/|tokenAdm' -- uzusis-front/src uzusis-front/angular.json uzusis-front/package.json`
   - `git grep --untracked -nE 'legado-dotnet|order-service-secret|refund-requested|RefundRequested|springdoc' -- uzusis-api docker-compose.yml`
   - `git grep --untracked -nE 'console\.log' -- uzusis-front/src`
   - `! grep -rE 'pk_(test|live)_' uzusis-front/src` e o mesmo no `dist/uzusis` do build
   - `! git grep -n stripe-mock -- docker-compose.yml` (o Stripe falso só existe no override)
   - `grep -q 'lang="pt-BR"' uzusis-front/src/index.html`
   - `! grep -rs legacy-peer-deps uzusis-front/.npmrc uzusis-front/Dockerfile`
   - `test ! -e uzusis-java && test ! -e scripts/legacy && test ! -e uzusis-api/docker-compose.yml && test ! -e uzusis-api/.env.example`
   - `! git grep -nE 'profiles: \[legacy\]|--profile legacy|scripts/legacy|uzusis-java|UZUSIS\.API' -- docker-compose.yml .env.example README.md uzusis-api scripts` (sem .NET)
7. Os READMEs descrevem: subir, portas, chaves Stripe (whsec com `--no-deps`, `COMPOSE_PROFILES`/`WEB_PORT`/`PUBLIC_URL`
   no `.env`, endpoint de produção), e2e, seed, observability, o front em contêiner (dev, build, teste), reimport do
   realm (e quando é obrigatório), recuperação do Debezium (R10), o volume antigo `uzusis_db-data` e o aviso sobre `down -v`.

---

## 12. Riscos e pontos em aberto

| # | Risco / ponto | Mitigação ou decisão padrão |
|---|---|---|
| R1 | A porta 8080 do host está ocupada por outro projeto | Verificar com `WEB_PORT=8088 PUBLIC_URL=http://localhost:8088`; nunca parar o contêiner alheio |
| R2 | RAM (cerca de 3,4 GB livres, com swap em uso) e o pico de build | `mem_limit`, heaps fixos, build Maven único; builds dos agentes serializados por `flock` (§10); `docker compose build web` antes do resto (§11) |
| R3 | Disco com cerca de 16 GB (a imagem do Debezium já ocupa 2,16 GB) | Imagens alpine, um build Java com `lib/` compartilhado; `docker builder prune` se faltar espaço (nunca `volume prune`) |
| R4 | O caminho do health do Keycloak na porta 9000 pode ser `/health/ready` em vez de `/auth/health/ready` | (a) confere com `docker compose exec keycloak` e usa o que responder |
| R5 | `strictDiscoveryDocumentValidation` do angular-oauth2-oidc exige todos os endpoints do discovery sob o issuer | Resolvido: sem `KC_HOSTNAME_BACKCHANNEL_DYNAMIC`, todas as URLs saem de `KC_HOSTNAME` (§8.1); conferido em 8088, também com `X-Forwarded-*` forjados e atrás de TLS (`https://…`) num Keycloak descartável |
| R6 | `prompt=create` é ignorado pelo KC 26.0.8 (confirmado) | O fallback é o link "Cadastre-se" na tela de login (aceito; o fluxo (a) de §11.7 passa por ele). Melhoria possível: o endpoint `…/protocol/openid-connect/registrations` abre o cadastro direto |
| R7 | O Payment Element não é testável com o stripe-mock | O e2e cobre a saga pela API; o teste com cartão `4242…` é manual, depois das chaves (README) |
| R8 | A corrida `order.cancelled` antes de `order.created` no catalog (tópicos diferentes; acontece quando o catalog reinicia ou atrasa e drena os dois juntos) prenderia estoque num pedido cancelado | Tratada: tabela `pedido_cancelado`; `reservar` ignora pedido já cancelado (§6.2 item 7) |
| R9 | `aud` não é validado: um access token do `admin-cli` ou do `mobile-app` vale na API (o ID token não: `typ = Bearer`, §4.0) | Necessário para o e2e com `admin-cli`; aceito em dev. Fora de dev, desligar o direct grant do `admin-cli` (README) |
| R10 | Um slot lógico ocioso segura WAL no Postgres compartilhado; um slot invalidado para a saga **em silêncio** (o `connect-init` só confere na subida) | `max_slot_wal_keep_size=1GB` e `heartbeat.interval.ms=10000`. Diagnóstico: `GET /connectors?expand=status`. Recuperação: `DELETE /connectors/outbox-<svc>`, `select pg_drop_replication_slot('outbox_<svc>')` no database do serviço e `docker compose up connect-init` (os offsets sobrevivem ao `DELETE`, mas com `snapshot.mode=when_needed` o conector vê que a posição salva não existe no slot novo e refaz o snapshot, reenviando a outbox; os consumidores são idempotentes). No README |
| R11 | A MinIO removeu `minio/minio` e `minio/mc` do Docker Hub (pull falha numa máquina nova) | Fixado em `pgsty/minio:RELEASE.2026-08-04T00-00-00Z` (build comunitário do mesmo binário, publicado no Docker Hub, traz `minio` e `mc`); mesmo formato de volume. Anotado no README |
| R12 | *(removido: com `DOCKER_HOST` no surefire, o Testcontainers não grava nada no home; §6.1 e §11)* | — |
| R13 | Acessórios só têm tamanhos PP–GG (sem "Único") | Decisão D6; aberto a um tamanho `U` no futuro |
| R14 | Sem CSP nem rate limiting | Fora do escopo (§1); anotado |
| R15 | Pix e boleto são assíncronos e não cabem na expiração de 30 min | Só cartão (`payment_method_types=["card"]`); Pix fica para depois, com `expires_after_seconds` menor que a expiração (§1) |
| R16 | Mudar `PUBLIC_URL`/`WEB_PORT` depois do primeiro boot quebra o login ("Invalid redirect uri"): o realm só é importado uma vez | Reimportar o realm (§8.3). A integração faz isso se a porta final diferir da de verificação; o README avisa |
| R17 | C8 grava estoque absoluto: o admin lê 5, uma reserva baixa para 4, o admin grava 7 e surge uma peça fantasma | Aceito (um admin, volume baixo). Correção futura: `quantidadeAnterior` por sigla em C8 → 409 se mudou |
| R18 | Com chaves reais e sem stripe-cli nem endpoint cadastrado, os webhooks se perdem | A reconciliação de 2 min confirma os pagamentos (§6.4 item 9); o README manda usar `COMPOSE_PROFILES=stripe` em dev e o endpoint em produção |
| R19 | O Node do host (20) não roda o Angular 22 | `npm`/`ng` no contêiner `node:22-alpine` (§11, README); a imagem `web` já constrói com ele |
| R20 | O helm tem textos fixos em inglês que o brain não expõe (o rótulo da região de toasts, "Notifications alt+T") | Aceito, impacto baixo. Os editáveis (sheet, diálogo, spinner) já estão em pt-BR (§7.4) |

---

## Apêndice A — Dados do MySQL antigo (`uzusis_db-data`)

O MySQL do .NET saiu do repositório e do compose, mas o volume `uzusis_db-data` (MySQL 8.0, database `uzusis`, cerca
de 190 MB) continua no disco. Nada do projeto o monta ou apaga. Ele só serve se um dia quiserem migrar aqueles dados:
execução única e manual (§1, "Fora do escopo"), depois do §11 verde.

1. **Backup** (o `mysqld` grava no volume ao subir):
   `docker run --rm -v uzusis_db-data:/v -v "$PWD":/b alpine tar czf /b/db-data.tgz -C /v .`
   (`db-data.tgz` está no `.gitignore`).
2. **Abrir**, sem compose, num contêiner avulso:
   ```bash
   docker run --rm -d --name uzusis-mysql-antigo -v uzusis_db-data:/var/lib/mysql mysql:8.0
   docker exec -it uzusis-mysql-antigo mysql -uroot -p uzusis       # senha root original
   ```
   Com o volume já inicializado, a imagem não recria nada nem pede `MYSQL_ROOT_PASSWORD`. As credenciais são as
   originais do `.env` do .NET (`DB_ROOT_PASSWORD`, `DB_USER`, `DB_PASSWORD`), que **não** estão no repositório:
   sem elas, não há migração. Exportar em TSV: `docker exec uzusis-mysql-antigo mysql -uroot -p… -N -B uzusis -e "SELECT …" > x.tsv`.
3. Checagem de e-mails duplicados por caixa (a migração não segue enquanto houver duplicata):
   `SELECT LOWER(Email), COUNT(*) FROM Cliente GROUP BY LOWER(Email) HAVING COUNT(*) > 1;`
4. **Produtos** (`Produto`, `Tamanho`) → `catalog`:
   - `produto`: `OVERRIDING SYSTEM VALUE` mantém os ids; `categoria = UPPER(Categoria)` (a coluna guarda o nome:
     `Calca`→`CALCA`…; se vier número, mapear 0..8 na ordem de §4.1); `ativo = true`; `criado_em = CriadoEm`;
   - `tamanho` P/M/G;
   - `foto`: **não migra**. O bucket do MinIO antigo estava vazio (0 objetos), então as linhas `Foto` apontariam para
     arquivos inexistentes. Os produtos entram sem foto (a vitrine mostra o placeholder) e o admin envia as fotos de
     novo pelo painel (C10);
   - depois, `setval` nas sequences.
5. **Clientes → Keycloak**:
   - ler um `Cliente.Senha`. Se for PHC `$argon2id$v=19$m=…,t=…,p=…$salt$hash`, montar a credencial Argon2 do
     Keycloak (`credentialData` com algoritmo, versão, memória, iterações e paralelismo; `secretData` com
     `value`/`salt` em base64) e importar pela Admin API **um** usuário conhecido, testando o login antes do lote;
   - se o formato não bater: importar sem senha, com `requiredActions: ["UPDATE_PASSWORD"]`, e avisar os clientes
     para usar "Esqueci minha senha";
   - `emailVerified: false`, papel `CUSTOMER`. Administradores do .NET **não** migram: criar no console do Keycloak
     com o papel `ADMIN`.
6. **Perfis**: para cada usuário criado, pegar o `sub` (`GET /auth/admin/realms/uzusis/users?email=`) e inserir em
   `identity.perfil`: e-mail em minúsculas, CPF e celular só com dígitos, `estado` convertido de nome para UF
   ("Ceará"→`CE`: o front antigo mandava o nome do ViaCEP).
7. **Histórico de compras** (`Compra`/`ItemCompra` → `orders.pedido`/`item_pedido`), por SQL direto, **sem outbox**
   (nenhum e-mail sai):
   - status `RECEBIDO` se todos os itens foram recebidos, `ENVIADO` se todos foram enviados, senão `PAGO`;
   - `cliente_sub` pelo mapa `ClienteId→sub`; `frete 0`, `subtotal = valor_total = ValorTotal`;
     `pago_em = criado_em = CriadoEm`; endereço = o endereço atual do cliente;
   - `tamanho_id` remapeado por `(produto_id, sigla)`; `nome_produto` do produto.
   Sacolas pendentes (`Pedido` com `CarrinhoId`) **não** migram.
8. Conferir contagens (produtos, tamanhos, usuários, perfis, pedidos) contra o MySQL e abrir a loja com um cliente migrado.
9. `docker stop uzusis-mysql-antigo` (o `--rm` apaga o contêiner; o volume fica).

---

## Críticas rejeitadas

Nenhuma crítica foi rejeitada por inteiro. Estas partes não entraram, ou entraram de outro jeito:

| Crítica | O que não entrou | Motivo |
|---|---|---|
| coverage 6 | `STRIPE_METODOS` configurável, com Pix e `expires_after_seconds` | O conflito com a expiração é resolvido com menos configuração fixando `card` (feasibility 4). Pix está fora do escopo (§1) e não há conta para testar. |
| coverage 3 | "a linha da sacola é atualizada" no O6 | No sucesso a sacola é esvaziada; no 422 o contrato é não mexer em nada. O O2 e o O3 já atualizam preço, nome e foto. |
| coverage 10 | Afirmar no `TratadorDeErrosTest` o `detail` pt-BR de um `@NotBlank` sem `message` | O teste é MockMvc standalone e não lê o `application.yml`: provaria o locale do teste, não o do serviço. A config é conferida por grep em §11, e os `*ControllerSecurityTest` com contexto real conferem o `detail` pt-BR. |
| coverage 17 | "um 3º pedido PAGO e um 4º ENVIADO" | Ficam 2 `PAGO` e 1 `ENVIADO`: o fluxo (g) de §11.7 consome um `PAGO` e o `ENVIADO`, e `/admin/pedidos` sairia vazio no screenshot. |
| coverage 19 | `docker compose ps --format '{{.Service}} {{.Publishers}}'` | `.Publishers` imprime structs. Trocado por `{{.Ports}}` + `grep -- '->'`. |
| feasibility 6 | Dois locks (Maven e ng) e `CI=1` para desligar o cache do Angular | Com 3,4 GB livres, um `mvn verify` com Testcontainers e um `ng build` não cabem juntos. Um lock único resolve a memória, o `~/.m2` e o `.angular/cache` de uma vez; `CI=1` ficaria redundante e deixaria os builds mais lentos. |
| feasibility 12, 20, 21 | As alternativas: valores no `OrderShipped`, `client_max_body_size 6m` e tirar o filtro "Sem estoque" | Foram adotadas as outras opções da mesma crítica: e-mail de enviado sem valores, `max-swallow-size` (mantém o 413 em pt-BR até 8 MB) e `disponivel` em C4 (coverage 14). |
