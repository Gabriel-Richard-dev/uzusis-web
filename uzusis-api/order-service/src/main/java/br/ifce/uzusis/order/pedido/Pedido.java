package br.ifce.uzusis.order.pedido;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
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

    @Column(name = "cliente_nome", length = 200)
    private String clienteNome;

    @Embedded
    private EnderecoEntrega endereco;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal frete = BigDecimal.ZERO;

    /** Subtotal + frete: é o valor cobrado. */
    @Column(name = "valor_total", nullable = false, precision = 19, scale = 4)
    private BigDecimal valorTotal = BigDecimal.ZERO;

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

    @Column(name = "sacola_restaurada", nullable = false)
    private boolean sacolaRestaurada;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    @BatchSize(size = 50)
    private List<ItemPedido> itens = new ArrayList<>();

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm = OffsetDateTime.now();

    @Column(name = "pago_em")
    private OffsetDateTime pagoEm;

    @Column(name = "enviado_em")
    private OffsetDateTime enviadoEm;

    @Column(name = "recebido_em")
    private OffsetDateTime recebidoEm;

    @Column(name = "cancelado_em")
    private OffsetDateTime canceladoEm;

    @Column(name = "atualizado_em")
    private OffsetDateTime atualizadoEm;

    protected Pedido() {
    }

    public Pedido(String clienteSub, String clienteEmail, String clienteNome, EnderecoEntrega endereco, BigDecimal frete) {
        this.clienteSub = clienteSub;
        this.clienteEmail = clienteEmail;
        this.clienteNome = clienteNome;
        this.endereco = endereco;
        this.frete = frete;
        this.valorTotal = frete;
    }

    public void adicionarItem(long produtoId, long tamanhoId, String sigla, int quantidade,
                              BigDecimal valorUnitario, String nomeProduto, String fotoUrl) {
        itens.add(new ItemPedido(this, produtoId, tamanhoId, sigla, quantidade, valorUnitario, nomeProduto, fotoUrl));
        this.subtotal = itens.stream()
                .map(ItemPedido::getValorTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        this.valorTotal = subtotal.add(frete);
    }

    public void registrarEstoque(boolean reservado, String motivo) {
        this.estoqueReservado = reservado;
        if (!reservado) {
            this.motivoCancelamento = ate500(motivo);
        }
        this.atualizadoEm = OffsetDateTime.now();
    }

    public void registrarPagamento(boolean confirmado, String paymentIntentId, String motivo) {
        this.pagamentoConfirmado = confirmado;
        if (paymentIntentId != null) {
            this.paymentIntentId = paymentIntentId;
        }
        if (!confirmado) {
            this.motivoCancelamento = ate500(motivo);
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
        if (Boolean.FALSE.equals(estoqueReservado) || Boolean.FALSE.equals(pagamentoConfirmado)) {
            // Mesmo com pagamento confirmado: o payment estorna ao ver o order.cancelled.
            return Desfecho.CANCELAR;
        }
        if (Boolean.TRUE.equals(estoqueReservado) && Boolean.TRUE.equals(pagamentoConfirmado)) {
            return Desfecho.PAGAR;
        }
        return Desfecho.PENDENTE;
    }

    /**
     * Os itens voltam para a sacola quando o estoque não foi negado (pagamento
     * recusado ou expirado): o cliente finaliza de novo sem remontar a sacola.
     * Na rejeição de estoque não há o que devolver.
     */
    public boolean devolveASacolaAoCancelar() {
        return !Boolean.FALSE.equals(estoqueReservado);
    }

    public void pagar() {
        this.status = StatusPedido.PAGO;
        this.pagoEm = OffsetDateTime.now();
        this.atualizadoEm = pagoEm;
    }

    public void cancelar(String motivo, boolean sacolaRestaurada) {
        this.status = StatusPedido.CANCELADO;
        if (motivo != null) {
            this.motivoCancelamento = ate500(motivo);
        }
        this.sacolaRestaurada = sacolaRestaurada;
        this.canceladoEm = OffsetDateTime.now();
        this.atualizadoEm = canceladoEm;
    }

    public void enviar() {
        this.status = StatusPedido.ENVIADO;
        this.enviadoEm = OffsetDateTime.now();
        this.atualizadoEm = enviadoEm;
    }

    public void receber() {
        this.status = StatusPedido.RECEBIDO;
        this.recebidoEm = OffsetDateTime.now();
        this.atualizadoEm = recebidoEm;
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

    public String getClienteNome() {
        return clienteNome;
    }

    public EnderecoEntrega getEndereco() {
        return endereco;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public BigDecimal getFrete() {
        return frete;
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

    public boolean isSacolaRestaurada() {
        return sacolaRestaurada;
    }

    public List<ItemPedido> getItens() {
        return itens;
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }

    public OffsetDateTime getPagoEm() {
        return pagoEm;
    }

    public OffsetDateTime getEnviadoEm() {
        return enviadoEm;
    }

    public OffsetDateTime getRecebidoEm() {
        return recebidoEm;
    }

    public OffsetDateTime getCanceladoEm() {
        return canceladoEm;
    }

    /**
     * A coluna é VARCHAR(500) e o motivo vem de outro serviço (o do catálogo
     * lista cada item sem estoque): texto maior faria o flush falhar sempre, e
     * o evento acabaria na DLQ com o pedido parado em CRIADO.
     */
    private static String ate500(String motivo) {
        return motivo == null ? null : motivo.substring(0, Math.min(500, motivo.length()));
    }
}
