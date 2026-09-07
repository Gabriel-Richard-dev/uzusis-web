package br.ifce.uzusis.catalog.produto;

import br.ifce.uzusis.catalog.produto.ProdutoDtos.AtualizarProduto;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.CriarProduto;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.ProdutoResposta;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/produtos")
public class ProdutoController {

    private final ProdutoService service;

    public ProdutoController(ProdutoService service) {
        this.service = service;
    }

    /** Vitrine: aberta, é o que o cliente vê antes de logar. */
    @GetMapping
    public Page<ProdutoResposta> listar(
            @RequestParam(required = false) CategoriaProduto categoria,
            @RequestParam(required = false) String nome,
            @PageableDefault(size = 20) Pageable pagina) {
        return service.listar(categoria, nome, pagina);
    }

    @GetMapping("/{id}")
    public ProdutoResposta obter(@PathVariable long id) {
        return service.obter(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ProdutoResposta criar(@RequestBody @Valid CriarProduto requisicao) {
        return service.criar(requisicao);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ProdutoResposta atualizar(@PathVariable long id, @RequestBody @Valid AtualizarProduto requisicao) {
        return service.atualizar(id, requisicao);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> excluir(@PathVariable long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
