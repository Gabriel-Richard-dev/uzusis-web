-- Status no nível do pedido (CRIADO → PAGO → ENVIADO → RECEBIDO | CANCELADO),
-- frete e endereço de entrega copiados para o pedido: mudar o perfil depois
-- não muda para onde um pedido já pago vai.
ALTER TABLE pedido
    ADD COLUMN subtotal             NUMERIC(19,4) NOT NULL DEFAULT 0,
    ADD COLUMN frete                NUMERIC(19,4) NOT NULL DEFAULT 0,
    ADD COLUMN cliente_nome         VARCHAR(200),
    ADD COLUMN entrega_destinatario VARCHAR(200),
    ADD COLUMN entrega_telefone     VARCHAR(11),
    ADD COLUMN entrega_cep          VARCHAR(9),
    ADD COLUMN entrega_rua          VARCHAR(200),
    ADD COLUMN entrega_numero       VARCHAR(20),
    ADD COLUMN entrega_complemento  VARCHAR(100),
    ADD COLUMN entrega_bairro       VARCHAR(100),
    ADD COLUMN entrega_cidade       VARCHAR(100),
    ADD COLUMN entrega_uf           VARCHAR(2),
    ADD COLUMN pago_em              TIMESTAMPTZ,
    ADD COLUMN enviado_em           TIMESTAMPTZ,
    ADD COLUMN recebido_em          TIMESTAMPTZ,
    ADD COLUMN cancelado_em         TIMESTAMPTZ,
    ADD COLUMN sacola_restaurada    BOOLEAN       NOT NULL DEFAULT FALSE;

-- Pedidos antigos não tinham frete: o total era o subtotal.
UPDATE pedido SET subtotal = valor_total;

CREATE INDEX idx_pedido_status_pago ON pedido (status, pago_em);

-- Nome e foto gravados como snapshot: a sacola e o pedido não precisam
-- consultar o catálogo item a item para se mostrar.
ALTER TABLE item_carrinho
    ADD COLUMN nome_produto VARCHAR(120),
    ADD COLUMN foto_url     VARCHAR(500);

ALTER TABLE item_pedido
    ADD COLUMN nome_produto VARCHAR(120),
    ADD COLUMN foto_url     VARCHAR(500);

-- O envio agora é do pedido inteiro, não de cada item.
DROP INDEX idx_item_pedido_enviado;
ALTER TABLE item_pedido
    DROP COLUMN enviado,
    DROP COLUMN recebido;
