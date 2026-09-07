package br.ifce.uzusis.order.pedido;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * O pedido fechado e o estado da saga de compra.
 *
 * <p>Cuidado com o nome na tradução: no .NET, {@code Pedido} era a LINHA do
 * carrinho e {@code Compra} era o pedido fechado. Aqui {@code Pedido} é o
 * pedido fechado (a antiga Compra) e a linha do carrinho é
 * {@link br.ifce.uzusis.order.carrinho.ItemCarrinho}. Ler o código antigo com
 * os nomes novos na cabeça é o caminho mais rápido para inverter uma regra.
 *
 * <p>O estado da saga é guardado como duas respostas independentes em vez de
 * uma sequência de passos, porque webhook e evento chegam fora de ordem: o
 * pagamento pode ser confirmado antes do estoque responder. Quem decide é
 * {@link #avaliar()}, olhando o estado final, nunca a ordem de chegada.
 */
@Entity
@Table(name = "pedido")
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** O "sub" do token do Keycloak. Não guardamos id de tabela de usuário. */
    @Column(name = "cliente_sub", nullable = false, length = 64)
    private String clienteSub;

    @Column(name = "cliente_email", nullable = false, length = 200)
    private String clienteEmail;

    @Column(name = "valor_total", nullable = false, precision = 19, scale = 4)
    private BigDecimal valorTotal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusPedido status = StatusPedido.CRIADO;

    /** null enquanto o catálogo não respondeu. */
    @Column(name = "estoque_reservado")
    private Boolean estoqueReservado;

    /** null enquanto a Stripe não respondeu. */
    @Column(name = "pagamento_confirmado")
    private Boolean pagamentoConfirmado;

    @Column(name = "payment_intent_id", length = 100)
    private String paymentIntentId;

    @Column(name = "motivo_cancelamento", length = 500)
    private String motivoCancelamento;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 50)
    private List<ItemPedido> itens = new ArrayList<>();

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm = OffsetDateTime.now();

    @Column(name = "atualizado_em")
    private OffsetDateTime atualizadoEm;

    protected Pedido() {
    }

    public Pedido(String clienteSub, String clienteEmail) {
        this.clienteSub = clienteSub;
        this.clienteEmail = clienteEmail;
        this.valorTotal = BigDecimal.ZERO;
    }

    public void adicionarItem(long produtoId, long tamanhoId, String sigla, int quantidade, BigDecimal valorUnitario) {
        itens.add(new ItemPedido(this, produtoId, tamanhoId, sigla, quantidade, valorUnitario));
        this.valorTotal = itens.stream()
                .map(ItemPedido::getValorTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public void registrarEstoque(boolean reservado, String motivo) {
        this.estoqueReservado = reservado;
        if (!reservado) {
            this.motivoCancelamento = motivo;
        }
        this.atualizadoEm = OffsetDateTime.now();
    }

    public void registrarPagamento(boolean confirmado, String paymentIntentId, String motivo) {
        this.pagamentoConfirmado = confirmado;
        if (paymentIntentId != null) {
            this.paymentIntentId = paymentIntentId;
        }
        if (!confirmado) {
            this.motivoCancelamento = motivo;
        }
        this.atualizadoEm = OffsetDateTime.now();
    }

    /**
     * Decide pelo estado final. Um pedido já resolvido devolve PENDENTE: é o
     * que faz o evento repetido (ou atrasado) não reabrir nada.
     */
    public Desfecho avaliar() {
        if (status != StatusPedido.CRIADO) {
            return Desfecho.PENDENTE;
        }
        boolean estoqueNegado = Boolean.FALSE.equals(estoqueReservado);
        boolean pagamentoNegado = Boolean.FALSE.equals(pagamentoConfirmado);

        if (estoqueNegado || pagamentoNegado) {
            // Estoque negado com pagamento já confirmado é exatamente o caso
            // que a spec avisa que vai acontecer: cancela e estorna.
            return Boolean.TRUE.equals(pagamentoConfirmado)
                    ? Desfecho.CANCELAR_COM_ESTORNO
                    : Desfecho.CANCELAR;
        }
        if (Boolean.TRUE.equals(estoqueReservado) && Boolean.TRUE.equals(pagamentoConfirmado)) {
            return Desfecho.PAGAR;
        }
        return Desfecho.PENDENTE;
    }

    public void pagar() {
        this.status = StatusPedido.PAGO;
        this.atualizadoEm = OffsetDateTime.now();
    }

    public void cancelar(String motivo) {
        this.status = StatusPedido.CANCELADO;
        if (motivo != null) {
            this.motivoCancelamento = motivo;
        }
        this.atualizadoEm = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getClienteSub() {
        return clienteSub;
    }

    public String getClienteEmail() {
        return clienteEmail;
    }

    public BigDecimal getValorTotal() {
        return valorTotal;
    }

    public StatusPedido getStatus() {
        return status;
    }

    public String getPaymentIntentId() {
        return paymentIntentId;
    }

    public String getMotivoCancelamento() {
        return motivoCancelamento;
    }

    public List<ItemPedido> getItens() {
        return itens;
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }
}
