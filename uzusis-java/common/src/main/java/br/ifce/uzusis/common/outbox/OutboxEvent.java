package br.ifce.uzusis.common.outbox;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Transactional outbox. O evento é gravado nesta tabela na MESMA transação da
 * escrita de negócio; o Debezium lê o WAL do Postgres e publica no Kafka.
 * Sem isso existe a janela em que o pedido é salvo e o evento não é publicado
 * (ou o contrário), e essa janela só aparece em produção.
 *
 * Nomes de coluna em minúsculo e sem separador de propósito: é a convenção que
 * o EventRouter do Debezium espera (aggregatetype, aggregateid, type, payload).
 */
@Entity
@Table(name = "outbox")
public class OutboxEvent {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String aggregatetype;

    @Column(nullable = false)
    private String aggregateid;

    @Column(nullable = false)
    private String type;

    /** Tópico de destino, lido pelo Debezium via route.by.field. */
    @Column(nullable = false)
    private String topic;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String payload;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected OutboxEvent() {
    }

    OutboxEvent(UUID id, String aggregatetype, String aggregateid, String type, String topic, String payload) {
        this.id = id;
        this.aggregatetype = aggregatetype;
        this.aggregateid = aggregateid;
        this.type = type;
        this.topic = topic;
        this.payload = payload;
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public String getTopic() {
        return topic;
    }

    public String getPayload() {
        return payload;
    }
}
