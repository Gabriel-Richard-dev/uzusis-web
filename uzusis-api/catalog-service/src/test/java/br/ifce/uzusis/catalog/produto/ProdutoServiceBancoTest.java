package br.ifce.uzusis.catalog.produto;

import br.ifce.uzusis.catalog.PostgresDeTeste;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.ProdutoResposta;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.TamanhoRequisicao;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.TamanhoResposta;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Filtros, busca sem acento e estoque contra o Postgres de verdade (unaccent, EXISTS). */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({ProdutoService.class, PostgresDeTeste.class})
class ProdutoServiceBancoTest {

    private static final Pageable RECENTES = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "criadoEm"));

    @Autowired
    ProdutoService service;
    @Autowired
    ProdutoRepository produtos;

    private Produto produto(String nome, String preco, CategoriaProduto categoria, int estoqueM) {
        var produto = new Produto(nome, new BigDecimal(preco), "Descrição", categoria);
        produto.adicionarTamanho("M", estoqueM);
        return produtos.saveAndFlush(produto);
    }

    private static List<String> nomes(org.springframework.data.domain.Page<ProdutoResposta> pagina) {
        return pagina.getContent().stream().map(ProdutoResposta::nome).toList();
    }

    @Test
    void vitrine_esconde_inativo_e_esgotado() {
        produto("Blusa Ativa", "50.00", CategoriaProduto.BLUSA, 1);
        produto("Blusa Esgotada", "50.00", CategoriaProduto.BLUSA, 0);
        var inativa = produto("Blusa Inativa", "50.00", CategoriaProduto.BLUSA, 5);
        inativa.desativar();
        produtos.flush();

        assertThat(nomes(service.vitrine(null, null, RECENTES))).containsExactly("Blusa Ativa");
    }

    @Test
    void filtros_se_combinam_por_e_e_a_busca_ignora_caixa_e_acento() {
        produto("Calça Linho", "120.00", CategoriaProduto.CALCA, 2);
        produto("Blusa Linho Areia", "89.90", CategoriaProduto.BLUSA, 2);
        produto("Blusa Seda", "99.90", CategoriaProduto.BLUSA, 2);

        assertThat(nomes(service.vitrine(CategoriaProduto.BLUSA, "linho", RECENTES)))
                .containsExactly("Blusa Linho Areia");
        assertThat(nomes(service.vitrine(null, "calca", RECENTES))).containsExactly("Calça Linho");
        assertThat(nomes(service.vitrine(null, "LÍNHO", RECENTES)))
                .containsExactlyInAnyOrder("Calça Linho", "Blusa Linho Areia");
        assertThat(service.vitrine(null, "%", RECENTES).getTotalElements())
                .as("%% do termo é texto, não curinga")
                .isZero();
    }

    @Test
    void admin_filtra_por_disponivel_e_ativo() {
        produto("Ativo Com Estoque", "10.00", CategoriaProduto.BODY, 3);
        produto("Ativo Esgotado", "10.00", CategoriaProduto.BODY, 0);
        var inativo = produto("Inativo Esgotado", "10.00", CategoriaProduto.BODY, 0);
        inativo.desativar();
        produtos.flush();

        assertThat(nomes(service.listar(null, null, true, false, RECENTES))).containsExactly("Ativo Esgotado");
        assertThat(nomes(service.listar(null, null, null, false, RECENTES)))
                .containsExactlyInAnyOrder("Ativo Esgotado", "Inativo Esgotado");
        assertThat(service.listar(null, null, null, null, RECENTES).getTotalElements()).isEqualTo(3);
    }

    @Test
    void ordena_por_preco_e_recusa_campo_fora_da_lista() {
        produto("Médio", "50.00", CategoriaProduto.SAIA, 1);
        produto("Caro", "90.00", CategoriaProduto.SAIA, 1);
        produto("Barato", "10.00", CategoriaProduto.SAIA, 1);

        var porPreco = PageRequest.of(0, 20, Sort.by("preco"));
        assertThat(nomes(service.vitrine(null, null, porPreco))).containsExactly("Barato", "Médio", "Caro");

        var porDescricao = PageRequest.of(0, 20, Sort.by("descricao"));
        assertThatThrownBy(() -> service.vitrine(null, null, porDescricao))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Ordenação inválida");
    }

    @Test
    void estoque_define_a_sigla_enviada_sem_recriar_linhas() {
        var produto = new Produto("Short Jeans", new BigDecimal("70.00"), "Descrição", CategoriaProduto.SHORT);
        produto.adicionarTamanho("P", 3);
        produto.adicionarTamanho("M", 1);
        produto = produtos.saveAndFlush(produto);
        var antes = service.obter(produto.getId(), true).tamanhos();

        var depois = service.atualizarEstoque(produto.getId(),
                List.of(new TamanhoRequisicao("m", 7), new TamanhoRequisicao("PP", 2))).tamanhos();

        assertThat(depois).extracting(TamanhoResposta::sigla).containsExactly("PP", "P", "M");
        assertThat(depois).extracting(TamanhoResposta::quantidade).containsExactly(2, 3, 7);
        assertThat(depois.get(1).id()).isEqualTo(antes.get(0).id());
        assertThat(depois.get(2).id()).isEqualTo(antes.get(1).id());
        assertThat(depois.get(0).id()).isNotNull();
    }

    @Test
    void sigla_repetida_e_recusada() {
        var produto = produto("Body", "40.00", CategoriaProduto.BODY, 1);

        assertThatThrownBy(() -> service.atualizarEstoque(produto.getId(),
                List.of(new TamanhoRequisicao("M", 1), new TamanhoRequisicao("m", 2))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Tamanho repetido: M");
    }

    @Test
    void inativo_so_aparece_para_o_admin() {
        var produto = produto("Cropped", "30.00", CategoriaProduto.CROPPED, 1);
        service.excluir(produto.getId());
        service.excluir(produto.getId());

        assertThatThrownBy(() -> service.obter(produto.getId(), false))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Produto não encontrado");
        assertThat(service.obter(produto.getId(), true).ativo()).isFalse();
    }
}
