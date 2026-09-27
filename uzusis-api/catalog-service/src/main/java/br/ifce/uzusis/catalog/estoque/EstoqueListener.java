package br.ifce.uzusis.catalog.estoque;

import br.ifce.uzusis.common.event.Events;
import br.ifce.uzusis.common.event.LeitorDeEvento;
import br.ifce.uzusis.common.event.Topics;
import br.ifce.uzusis.common.idempotency.ConsumoIdempotente;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class EstoqueListener {

    private final LeitorDeEvento leitor;
    private final ConsumoIdempotente consumo;
    private final EstoqueService estoque;

    public EstoqueListener(LeitorDeEvento leitor, ConsumoIdempotente consumo, EstoqueService estoque) {
        this.leitor = leitor;
        this.consumo = consumo;
        this.estoque = estoque;
    }

    @KafkaListener(topics = Topics.ORDER_CREATED, groupId = "catalog-service")
    void aoCriarPedido(String mensagem) {
        var recebido = leitor.ler(mensagem, Events.OrderCreated.class);
        consumo.umaVez(recebido.eventId(),
                id -> estoque.reservar(recebido.payload().orderId(), recebido.payload().itens()));
    }

    @KafkaListener(topics = Topics.ORDER_CANCELLED, groupId = "catalog-service")
    void aoCancelarPedido(String mensagem) {
        var recebido = leitor.ler(mensagem, Events.OrderCancelled.class);
        consumo.umaVez(recebido.eventId(), id -> estoque.devolver(recebido.payload().orderId()));
    }
}
