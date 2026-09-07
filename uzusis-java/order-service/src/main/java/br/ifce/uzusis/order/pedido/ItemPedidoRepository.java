package br.ifce.uzusis.order.pedido;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemPedidoRepository extends JpaRepository<ItemPedido, Long> {

    List<ItemPedido> findByEnviado(boolean enviado);
}
