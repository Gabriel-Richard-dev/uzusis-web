-- Soft delete: apagar o produto quebrava a FK de reserva_estoque (500) e
-- deixava sacolas e pedidos apontando para nada.
ALTER TABLE produto ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE foto ADD COLUMN ordem INTEGER NOT NULL DEFAULT 0;
-- Chave do objeto no bucket, para apagar a foto. Nula nas linhas antigas.
ALTER TABLE foto ADD COLUMN chave VARCHAR(300);

CREATE INDEX idx_produto_ativo_criado ON produto (ativo, criado_em DESC);
CREATE INDEX idx_produto_categoria ON produto (categoria);

-- Busca da vitrine sem acento ("calca" acha "Calça"). A extensão é trusted:
-- o dono do database cria sem ser superusuário.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Pedidos cujo order.cancelled já foi processado. order.created e
-- order.cancelled vêm de tópicos diferentes, sem ordem entre si: se o
-- cancelamento chega antes, a reserva que vier depois é ignorada aqui.
CREATE TABLE pedido_cancelado (
    order_id BIGINT PRIMARY KEY
);
