-- Tabelas que todo serviço que publica ou consome evento precisa ter.
-- Vive no jar do common e entra em cada serviço por
-- spring.flyway.locations=classpath:db/migration,classpath:db/migration/common,
-- para o schema não ser copiado e colado em cinco lugares.

CREATE TABLE outbox (
    id            UUID         PRIMARY KEY,
    aggregatetype VARCHAR(100) NOT NULL,
    aggregateid   VARCHAR(100) NOT NULL,
    type          VARCHAR(100) NOT NULL,
    topic         VARCHAR(200) NOT NULL,
    payload       JSONB        NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL
);

-- O Debezium lê o WAL, não a tabela, então não há índice de leitura aqui.
-- ponytail: sem poda das linhas antigas; um DELETE por idade quando o volume
-- incomodar (o WAL já carregou o evento, a linha só serve de auditoria).

CREATE TABLE processed_event (
    event_id     UUID        PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL
);
