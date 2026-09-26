package br.ifce.uzusis.catalog.produto;

import br.ifce.uzusis.catalog.produto.ProdutoDtos.AtualizarEstoque;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.AtualizarProduto;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.CategoriaResposta;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.CriarProduto;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.FotoResposta;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.OrdemFotos;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.ProdutoResposta;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
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
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/produtos")
public class ProdutoController {

    private final ProdutoService service;
    private final FotoService fotos;

    public ProdutoController(ProdutoService service, FotoService fotos) {
        this.service = service;
        this.fotos = fotos;
    }

    /** Vitrine: aberta, é o que o cliente vê antes de logar. */
    @GetMapping
    public Page<ProdutoResposta> vitrine(
            @RequestParam(required = false) CategoriaProduto categoria,
            @RequestParam(required = false) String nome,
            @PageableDefault(size = 12, sort = "criadoEm", direction = Sort.Direction.DESC) Pageable pagina) {
        return service.vitrine(categoria, nome, pagina);
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<ProdutoResposta> listar(
            @RequestParam(required = false) CategoriaProduto categoria,
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) Boolean ativo,
            @RequestParam(required = false) Boolean disponivel,
            @PageableDefault(size = 20, sort = "criadoEm", direction = Sort.Direction.DESC) Pageable pagina) {
        return service.listar(categoria, nome, ativo, disponivel, pagina);
    }

    @GetMapping("/categorias")
    public List<CategoriaResposta> categorias() {
        return Arrays.stream(CategoriaProduto.values())
                .map(c -> new CategoriaResposta(c.name(), c.getNomeExibicao()))
                .toList();
    }

    /** Rota pública: o Authentication é null para o anônimo. */
    @GetMapping("/{id}")
    public ProdutoResposta obter(@PathVariable long id, Authentication autenticacao) {
        var admin = autenticacao != null && autenticacao.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        return service.obter(id, admin);
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

    @PutMapping("/{id}/estoque")
    @PreAuthorize("hasRole('ADMIN')")
    public ProdutoResposta atualizarEstoque(@PathVariable long id, @RequestBody @Valid AtualizarEstoque requisicao) {
        return service.atualizarEstoque(id, requisicao.tamanhos());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void excluir(@PathVariable long id) {
        service.excluir(id);
    }

    /** required=false: sem a parte, o 400 sai com o texto do contrato e não com o genérico. */
    @PostMapping("/{id}/fotos")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public FotoResposta enviarFoto(@PathVariable long id,
                                   @RequestParam(name = "arquivo", required = false) MultipartFile arquivo)
            throws IOException {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie o arquivo no campo 'arquivo'.");
        }
        return fotos.enviar(id, arquivo.getBytes());
    }

    @DeleteMapping("/{id}/fotos/{fotoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void removerFoto(@PathVariable long id, @PathVariable long fotoId) {
        fotos.remover(id, fotoId);
    }

    @PutMapping("/{id}/fotos/ordem")
    @PreAuthorize("hasRole('ADMIN')")
    public List<FotoResposta> reordenarFotos(@PathVariable long id, @RequestBody @Valid OrdemFotos requisicao) {
        return fotos.reordenar(id, requisicao.fotoIds());
    }
}
