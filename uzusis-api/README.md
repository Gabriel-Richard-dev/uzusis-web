# Uzusis API — microserviços

Backend da loja: microserviços Spring Boot 3.3 (Java 21) com Kafka, Postgres,
Keycloak, Stripe e MinIO. Substituiu a antiga API .NET, que foi removida do
repositório (está no histórico do git).

**Como subir, portas, Stripe, e2e, seed, reimport do realm e recuperação do
Debezium: veja o [README da raiz](../README.md).** O compose é um só, na raiz;
este diretório tem o código, o `Dockerfile` e a infra (`infra/`).

## Módulos

| Módulo                 | Porta interna | O que é                                                              |
|------------------------|---------------|----------------------------------------------------------------------|
| `gateway`              | 8080          | Spring Cloud Gateway. Valida o JWT na borda e roteia `/api/**`        |
| `catalog-service`      | 8082          | Produtos, estoque por tamanho (PP–GG) e fotos no MinIO. Reserva estoque na saga |
| `order-service`        | 8083          | Sacola, pedido, frete e expiração. **Orquestrador da saga**          |
| `payment-service`      | 8084          | Único que fala com a Stripe: intent, webhook, reconciliação, estorno |
| `notification-service` | 8085          | Consome eventos e manda os e-mails (pago, enviado, cancelado). Sem API |
| `identity-service`     | 8086          | Perfil do cliente (CPF, celular, endereço), chaveado pelo `sub`      |
| `common`               | —             | Envelope de evento, outbox, idempotência, papéis do Keycloak, erros  |

Nenhum serviço publica porta: o nginx do front repassa `/api/**` ao gateway, que
tira o prefixo (`StripPrefix=1`) e manda para o serviço dono do caminho.

- `/api/produtos/**` → catalog (GET público; `/produtos/admin/**` e escrita só ADMIN)
- `/api/carrinho/**`, `/api/pedidos/**` → order
- `/api/pagamentos/**`, `/api/webhooks/stripe` → payment (`GET /pagamentos/config` e o webhook são públicos)
- `/api/perfil/**` → identity

**Autenticação**: token do Keycloak (realm `uzusis`, client público `web-app`,
Authorization Code + PKCE). O gateway **e** cada serviço validam o JWT: o `iss`
é a URL pública (`${PUBLIC_URL}/auth/realms/uzusis`) e as chaves vêm pela rede
interna (`KEYCLOAK_JWKS_URI`). O papel vem só de `realm_access.roles` (`ADMIN`,
`CUSTOMER`); o dono de um recurso é sempre o `sub` do token.

**Imagem**: o `Dockerfile` faz um único `mvn package` e extrai os 6 jars com
`-Djarmode=tools` para um `lib/` compartilhado. O compose usa a mesma imagem
`uzusis-api:dev` nos 6 serviços e escolhe o jar pela variável `MODULO`.

## Fluxo da compra

```
POST /api/pedidos         order revalida a sacola no catálogo (preço, ativo, estoque),
   │                      calcula o frete e cria o pedido em CRIADO
   └─ outbox ─> Debezium ─> order.order.created.v1
                              ├─> catalog reserva o estoque ─> catalog.stock.reserved.v1 | .rejected.v1
                              └─> payment cria o PaymentIntent (só cartão)

GET /api/pagamentos/{id}/client-secret
   o front confirma com a Stripe (o cartão não passa pelo backend)

Stripe ─webhook─> payment (assinatura, dedup por event.id)  [ou a reconciliação a cada 2 min]
   └─> payment.payment.succeeded.v1 | .failed.v1
          └─> order decide pelo estado final:
                estoque ok + pagamento ok  -> PAGO      -> order.order.paid.v1
                qualquer um negado         -> CANCELADO -> order.order.cancelled.v1
                CRIADO há mais de 30 min   -> CANCELADO -> order.order.cancelled.v1

order.order.cancelled.v1 ─> catalog devolve o estoque
                         ─> payment cancela o intent, ou estorna se já estava pago
                         ─> notification manda o e-mail
POST /api/pedidos/{id}/enviar (admin) ─> order.order.shipped.v1 ─> e-mail de envio
```

- Status do pedido: `CRIADO → PAGO → ENVIADO → RECEBIDO`, ou `CANCELADO`.
- Recusa do cartão ou expiração devolvem os itens à sacola (`sacolaRestaurada`);
  a rejeição de estoque, não.
- O único caminho de estorno é o payment consumir `order.cancelled`. Um pagamento
  que chega para pedido já cancelado é estornado na hora.

## Decisões que valem saber antes de mexer

**Outbox + Debezium.** Todo evento é gravado na tabela `outbox` na mesma
transação da escrita de negócio, e o `OutboxPublisher` tem
`@Transactional(propagation = MANDATORY)`: publicar fora de uma transação lança
exceção. O Debezium lê o WAL e publica no tópico da coluna `topic`. Os conectores
(`infra/debezium/registrar-conectores.sh`) são registrados pelo one-shot
`connect-init` depois do Flyway, com publication `filtered` (só `public.outbox`,
sem superusuário) e heartbeat.

**Idempotência.** Todo consumidor passa por `ConsumoIdempotente.umaVez()`, que
grava o `eventId` numa tabela com chave primária. Kafka entrega at-least-once:
reprocessamento é certeza, não hipótese.

**Ordem.** A chave de partição é sempre o id do pedido, o que garante ordem por
pedido num tópico. Entre tópicos não há ordem, e nada depende dela: o
`Pedido.avaliar()` decide pelo estado final, e o catalog lembra pedidos já
cancelados para não reservar estoque de um `order.created` atrasado.

**Dinheiro.** `BigDecimal` e `NUMERIC(19,4)` no banco, centavos em `long` no
evento e na Stripe. `Money` faz a ponte. O valor cobrado é calculado no servidor
(preço do catálogo no momento do pedido + frete).

**Um servidor de Postgres, cinco databases** (mais o do Keycloak). Nenhum
serviço lê a tabela de outro. Em produção, separar é trocar `DB_URL`.

**Sem Schema Registry, Pact nem MapStruct.** Os contratos dos eventos são os
records de `common/event/Events.java`, compartilhados por produtor e consumidor
em tempo de compilação; a versão está no nome do tópico (`.v1`). Os DTOs são
records com método de fábrica.

**`@Scheduled` sem ShedLock** (webhook, reconciliação, expiração de pedido). Com
uma réplica, funciona. Antes de escalar, entra ShedLock (comentários `ponytail:`
no código).

## Testes

```bash
mvn -f uzusis-api/pom.xml -B verify                    # tudo
mvn -f uzusis-api/pom.xml -B -pl gateway verify         # um módulo (depois de instalar o common)
bash uzusis-api/infra/debezium/testar-registrar.sh      # JSON dos conectores do Debezium
```

- Os testes com banco usam Testcontainers (`postgres:16-alpine`) e precisam do
  Docker. A versão é a **1.21.4**: a 1.21.3 falha com o Docker Engine 29
  ("client version 1.32 is too old"). O surefire recebe
  `DOCKER_HOST=unix:///var/run/docker.sock`, então **não** é preciso (nem
  desejado) criar `~/.testcontainers.properties`.
- Todo teste termina em `Test` (os de banco em `BancoTest`): não há failsafe, e
  um sufixo `IT` não rodaria no `verify`.
- Cada serviço tem um `*ApplicationContextTest` que sobe o contexto inteiro.

## Dados da API antiga

O volume `uzusis_db-data` (MySQL 8.0 da API .NET) continua no disco, mas o
compose não o declara nem monta: `docker compose down -v` não o apaga. Para
consultá-lo um dia (backup antes; a senha de root é a original, fora do repo):

```bash
docker run --rm -v uzusis_db-data:/v -v "$PWD":/b alpine tar czf /b/db-data.tgz -C /v .
docker run --rm -d --name uzusis-mysql-antigo -v uzusis_db-data:/var/lib/mysql mysql:8.0
docker exec -it uzusis-mysql-antigo mysql -uroot -p
docker stop uzusis-mysql-antigo
```

O mapeamento das tabelas para os serviços está no Apêndice A da [SPEC](../SPEC.md).
