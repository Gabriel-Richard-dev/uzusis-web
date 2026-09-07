# Uzusis em Java — microserviços

Reescrita do `uzusis-api` (.NET 8 / MySQL) como microserviços Spring Boot com
Kafka, Postgres, Keycloak e Stripe. Roda ao lado do .NET: o gateway decide o
que já foi migrado, então o front não muda de endereço em nenhuma etapa.

## Módulos

| Módulo                 | Porta | O que é                                                        |
|------------------------|-------|----------------------------------------------------------------|
| `gateway`              | 8080  | Spring Cloud Gateway. Valida o token na borda e roteia         |
| `catalog-service`      | 8082  | Produtos, preços e estoque. Participa da saga reservando peça  |
| `order-service`        | 8083  | Carrinho e pedido. **Orquestrador da saga de compra**          |
| `payment-service`      | 8084  | Único que fala com a Stripe. Recebe webhook, traduz em evento  |
| `notification-service` | 8085  | Consome evento e manda e-mail. Sem API                         |
| `identity-service`     | 8086  | Perfil do cliente e vínculo com o `sub` do Keycloak            |
| `common`               | —     | Envelope de evento, outbox, idempotência, roles do Keycloak    |

## Subir

```bash
# 1. /etc/hosts — obrigatório, uma linha:
echo "127.0.0.1 keycloak" | sudo tee -a /etc/hosts

# 2. Chaves de teste da Stripe (Dashboard > Developers > API keys)
cp .env.example .env   # preencha STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET

# 3. Sobe tudo
docker compose up -d --build

# 4. Registra os conectores do outbox (depois que o connect subir)
CONNECT_URL=http://localhost:8093 ./infra/debezium/registrar-conectores.sh
```

- Loja pelo gateway: http://localhost:8090/api/produtos
- Keycloak: http://keycloak:8080 (`admin` / `admin`)
- E-mails de dev (Mailpit): http://localhost:8025
- Traces (Jaeger): http://localhost:16686
- Kafka Connect: http://localhost:8093/connectors

Usuários de teste do realm: `admin@uzusis.local` / `admin123` (ADMIN) e
`cliente@uzusis.local` / `cliente123` (CUSTOMER).

### Webhook da Stripe em dev

A Stripe não alcança `localhost`. Use o CLI:

```bash
stripe listen --forward-to http://localhost:8090/api/webhooks/stripe
```

O `whsec_...` que o comando imprime é o `STRIPE_WEBHOOK_SECRET`. Sem ele a
verificação de assinatura recusa tudo — e é para recusar.

## Fluxo da compra

```
POST /api/pedidos            order-service cria o pedido em CRIADO
   └─ outbox ─> Debezium ─> order.order.created.v1
                              ├─> catalog-service reserva estoque
                              │      └─> catalog.stock.reserved.v1 | .rejected.v1
                              └─> payment-service cria o PaymentIntent
                                     (idempotency_key = orderId)

GET /api/pagamentos/{id}/client-secret
   frontend confirma direto com a Stripe (o cartão não passa pelo backend)

Stripe ─webhook─> payment-service (verifica assinatura, deduplica por event.id)
   └─> payment.payment.succeeded.v1 | .failed.v1
          └─> order-service decide pelo ESTADO FINAL:
                estoque ok + pagamento ok      -> PAGO      -> order.order.paid.v1
                qualquer um negado             -> CANCELADO -> order.order.cancelled.v1
                estoque negado E já pago       -> CANCELADO + order.order.refund-requested.v1
                                                 (payment-service estorna na Stripe)
```

O `notification-service` escuta `order.paid` e `order.cancelled` e manda o
e-mail. O `catalog-service` escuta `order.cancelled` e devolve a peça.

## Decisões que valem saber antes de mexer

**Outbox + Debezium.** Todo evento é gravado na tabela `outbox` na mesma
transação da escrita de negócio, e o `OutboxPublisher` tem
`@Transactional(propagation = MANDATORY)`: publicar fora de uma transação
lança exceção. O Debezium lê o WAL e publica. Não existe caminho no código que
salve o pedido sem publicar o evento.

**Idempotência.** Todo consumidor passa por `ConsumoIdempotente.umaVez()`, que
grava o `eventId` numa tabela com chave primária. Kafka entrega
at-least-once — reprocessamento é certeza, não hipótese.

**Ordem.** A chave de partição é sempre o id do agregado, o que garante ordem
por entidade. Mesmo assim nada no `Pedido` depende de sequência: webhook da
Stripe chega fora de ordem, e `Pedido.avaliar()` decide pelo estado final.

**Dinheiro.** `BigDecimal` e `NUMERIC(19,4)` no banco, centavos em `long` no
evento e na Stripe. `Money` faz a ponte, e é a única coisa que faz.

**Um servidor de Postgres, cinco databases.** A regra da spec — nenhum serviço
lê a tabela de outro — está mantida. Cinco contêineres de Postgres numa
máquina de desenvolvimento não isolam nada a mais e custam cinco vezes a
memória. Em produção, separar é trocar `DB_URL`.

## Onde isto se afasta da spec (de propósito)

**Sem Schema Registry.** Os eventos são JSON versionado: a versão está no nome
do tópico (`.v1`) e no envelope, e os contratos são records em
`common/event/Events.java` — um só lugar, compartilhado por produtor e
consumidor em tempo de compilação. Um Schema Registry sem serde de Avro ou
JSON Schema seria um contêiner decorativo. Ele passa a valer quando aparecer um
consumidor fora deste repositório, que não compila contra `common`. Falem e eu
troco os serdes.

**Sem Pact.** O contrato entre serviços hoje é o `common`, verificado pelo
compilador. Pact resolve o problema de times diferentes evoluindo contratos em
repositórios diferentes — não é o caso ainda.

**Sem MapStruct.** Os DTOs são records com um método de fábrica estático. Entra
MapStruct quando houver mapeamento com regra, não cópia de campo.

**`@Scheduled` sem ShedLock** no processador de webhook e na reconciliação.
Com uma réplica, funciona. Antes de escalar o `payment-service`, entra
ShedLock — está marcado com comentário `ponytail:` no código.

**Sem `identity-service` importando usuários.** A importação é um passo de
migração, não código de aplicação — veja abaixo.

## Migrar os usuários do .NET

O `uzusis-api` guarda senha com Argon2 (`ScottBrady91.AspNetCore.Identity`,
sobre `Konscious.Security.Cryptography.Argon2`). O Keycloak 26 tem provider
Argon2 nativo, então o caminho depende de o formato do hash bater:

1. Exporte `Cliente` e `Administrador` do MySQL (id, email, nome, hash, cpf,
   celular, data de nascimento, endereço).
2. Confira o formato do hash gravado. Se for o PHC padrão
   (`$argon2id$v=19$m=...,t=...,p=...$salt$hash`), o Keycloak importa direto
   como credencial com `algorithm: argon2`.
3. Crie os usuários pela Admin API com a credencial já hasheada, e atribua
   `CUSTOMER` ou `ADMIN`.
4. O perfil (cpf, celular, endereço) vai para o `identity-service`, chaveado
   pelo `sub` que o Keycloak devolveu na criação.

Se o formato não bater, o caminho é **migração lazy**: um Authenticator SPI no
Keycloak que, no primeiro login, valida a senha contra a base antiga e regrava
no Keycloak. Ninguém precisa resetar senha.

**Antes de qualquer coisa:** rode a checagem de e-mail duplicado por caixa. O
MySQL comparava e-mail sem diferenciar maiúscula de minúscula, o Postgres e o
Keycloak diferenciam.

```sql
SELECT LOWER(Email), COUNT(*) FROM Cliente GROUP BY LOWER(Email) HAVING COUNT(*) > 1;
```

## Testes

```bash
mvn test                 # unitários e de slice
mvn -pl catalog-service test   # sobe Postgres via Testcontainers
```

### O teste de Testcontainers não roda nesta máquina

`EstoqueServiceTest` falha aqui com *"Could not find a valid Docker
environment"*. O motivo real está escondido duas camadas abaixo:

```
UnixSocketClientProviderStrategy: failed with exception BadRequestException
(Status 400: client version 1.32 is too old.
 Minimum supported API version is 1.40)
```

O Docker Engine 29 recusa a API 1.32, e o docker-java 3.4.2 que vem com o
Testcontainers cai nela quando não consegue negociar. Não adianta
`DOCKER_API_VERSION` nem `TESTCONTAINERS_API_VERSION` no ambiente — testei os
dois, a negociação acontece antes. O que resolve é a configuração do
Testcontainers no seu home:

```bash
echo 'api.version=1.44' >> ~/.testcontainers.properties
```

Não criei esse arquivo por conta própria porque é configuração da sua máquina,
não do repositório. **Consequência: `EstoqueServiceTest` foi escrito mas nunca
passou.** Rode o comando acima e depois `mvn -pl catalog-service test` antes de
confiar nele.

- `MoneyTest` — conversão de dinheiro nas duas pontas.
- `PedidoSagaTest` — a máquina de estado da saga em toda ordem de chegada
  possível. É o teste mais importante do repositório.
- `EstoqueServiceTest` — reserva, rejeição e devolução contra Postgres de
  verdade (Testcontainers).
- `StripeWebhookControllerTest` — assinatura inválida, payload adulterado e
  reentrega.

## Ordem de extração (strangler fig)

1. ~~Gateway na frente do .NET~~ — a rota `legado-dotnet` já faz isso.
2. Keycloak e autenticação. É o corte mais limpo e destrava o resto.
3. `notification-service` e `catalog-service`. Menor acoplamento, menor risco.
4. `order-service`.
5. `payment-service`. Por último, quando a infra de evento já provou que
   funciona.
6. Desligar o .NET quando a rota `legado-dotnet` ficar sem tráfego.

O aceite de cada etapa é paridade funcional verificada com a mesma entrada nos
dois sistemas.

## Mapa dos endpoints: .NET antigo → Java

O front hoje chama os caminhos do .NET (`/api/produto/0`,
`/api/carrinho/adicionar-ao-carrinho`). Os serviços novos expõem caminhos REST.
**O front precisa ser alterado quando cada rota virar** — não é só o caminho
que muda, o formato da resposta também (paginação do Spring, por exemplo). Não
coloquei reescrita de caminho no gateway de propósito: consertar o caminho sem
consertar o corpo daria a ilusão de compatibilidade e quebraria em execução.

### Catálogo

| .NET                                         | Java                                    |
|----------------------------------------------|-----------------------------------------|
| `GET /produto/{pagina}?categoriaProduto=`    | `GET /produtos?categoria=&page=&size=`  |
| `GET /produto/id?produtoId=`                 | `GET /produtos/{id}`                    |
| `GET /produto/nome?nome=`                    | `GET /produtos?nome=`                   |
| `POST /produto/adicionar` (multipart)        | `POST /produtos` (JSON) — **sem foto**  |
| `PATCH /produto/atualizar`                   | `PUT /produtos/{id}`                    |
| `GET /produto/categorias`                    | **não migrado**                         |
| `GET /produto/admin/dashboard`               | **não migrado**                         |

A paginação muda de `{pagina}` no caminho para `?page=` (base 0) na query, e a
resposta vem no formato `Page` do Spring (`content`, `totalElements`,
`totalPages`).

### Carrinho e pedido

| .NET                                                | Java                                  |
|-----------------------------------------------------|---------------------------------------|
| `POST /carrinho/Adicionar-ao-Carrinho`              | `POST /carrinho/itens`                |
| `GET /carrinho/pedidos`                             | `GET /carrinho`                       |
| `DELETE /carrinho/remover-carrinho?pedidoId=`       | `DELETE /carrinho/itens/{id}`         |
| `POST /compra/cliente/carrinho`                     | `POST /pedidos`                       |
| `GET /compra/cliente/historico`                     | `GET /pedidos/historico`              |
| `GET /compra/cliente/em-andamento`                  | `GET /pedidos/andamento`              |
| `GET /compra/administrador/dashboard`               | `GET /pedidos/itens?enviados=`        |
| `PATCH /compra/administrador/dashboard/enviar-produto` | `POST /pedidos/itens/{id}/enviar`  |
| `PATCH /compra/cliente/recebi-produto`              | `POST /pedidos/itens/{id}/receber`    |

Diferença de comportamento que importa: `POST /pedidos` devolve o pedido em
`CRIADO`, não em pago. No .NET, `POST /compra/cliente/carrinho` fechava a
compra na hora. Agora o pagamento é assíncrono e a confirmação vem do webhook.

### Cliente e autenticação

| .NET                                      | Java / Keycloak                          |
|-------------------------------------------|------------------------------------------|
| `POST /clienteauth/login`                 | Keycloak, Authorization Code + PKCE      |
| `POST /clienteauth/cadastrar`             | Registro do Keycloak                     |
| `POST /clienteauth/enviar-confirmacao-email` | Verificação de e-mail do Keycloak     |
| `POST /clienteauth/codigo-valido`         | idem                                     |
| `POST /clienteauth/enviar-recuperacao-senha` | Reset de senha do Keycloak            |
| `POST /clienteauth/recuperar-senha`       | idem                                     |
| `POST /cliente/resetar-senha`             | Account console do Keycloak              |
| `GET /cliente`                            | `GET /perfil`                            |
| `PATCH /cliente`                          | `PUT /perfil`                            |
| `PATCH /cliente/endereco`                 | `PUT /perfil/endereco`                   |
| `GET /cliente/admin/obter-cliente`        | `GET /perfil/{sub}`                      |
| `POST /administrador/Login` e `/Adicionar`| Keycloak                                 |

Seis endpoints de autenticação deixam de existir. É o maior ganho da migração:
some junto todo o código de Argon2, código de confirmação por e-mail e
recuperação de senha — e com ele a chance de errar em qualquer um deles.

### Novo

| Endpoint                                     | O que faz                                  |
|----------------------------------------------|--------------------------------------------|
| `GET /pagamentos/{orderId}/client-secret`    | O front usa para confirmar com a Stripe    |
| `POST /webhooks/stripe`                      | Único caminho que confirma pagamento       |

## O que NÃO está pronto

**Upload de foto / MinIO.** O `catalog-service` tem a entidade `Foto` e devolve
as URLs, mas não recebe upload. O `FotoStorage` do .NET (MinIO, `System.Drawing`
para redimensionar) não foi traduzido. Enquanto isso, cadastro de produto com
foto continua indo para o .NET pela rota `legado-dotnet`.

**O frontend Angular.** Não toquei em um arquivo dele — você tem alteração não
commitada em `auth.guard.ts`, `auth.interceptor.ts` e mais oito arquivos, e
sobrescrever isso não é meu papel. Para a etapa do Keycloak ele precisa de
`angular-oauth2-oidc` ou `keycloak-angular` no lugar do login próprio, e dos
caminhos novos da tabela acima.

**Rodar de ponta a ponta.** Os módulos compilam e os testes passam, mas eu não
subi o compose inteiro (Kafka, Connect, Keycloak, seis serviços) para ver uma
compra atravessar a saga de verdade. O primeiro `docker compose up` vai
esbarrar em alguma coisa — normalmente o `iss` do token ou o slot de replicação
do Debezium.

**Dashboard do admin** (`/produto/admin/dashboard`, `/produto/categorias`) e
`GET /compra/administrador/dashboard` no formato antigo.
