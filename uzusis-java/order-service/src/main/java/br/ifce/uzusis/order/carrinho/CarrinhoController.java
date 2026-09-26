package br.ifce.uzusis.order.carrinho;

import br.ifce.uzusis.order.carrinho.CarrinhoDtos.AdicionarItem;
import br.ifce.uzusis.order.carrinho.CarrinhoDtos.AlterarQuantidade;
import br.ifce.uzusis.order.carrinho.CarrinhoDtos.CarrinhoResposta;
import br.ifce.uzusis.order.carrinho.CarrinhoDtos.ItemResposta;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/carrinho")
public class CarrinhoController {

    private final CarrinhoService service;

    public CarrinhoController(CarrinhoService service) {
        this.service = service;
    }

    /**
     * O dono do carrinho vem do "sub" do token, nunca do corpo da requisição:
     * id de cliente que chega do cliente é convite para mexer no carrinho de
     * outra pessoa.
     */
    @GetMapping
    public CarrinhoResposta obter(@AuthenticationPrincipal Jwt jwt) {
        return service.obter(jwt.getSubject());
    }

    @PostMapping("/itens")
    @ResponseStatus(HttpStatus.CREATED)
    public ItemResposta adicionar(@AuthenticationPrincipal Jwt jwt, @RequestBody @Valid AdicionarItem requisicao) {
        return service.adicionar(jwt.getSubject(), requisicao);
    }

    @PutMapping("/itens/{itemId}")
    public ItemResposta alterar(@AuthenticationPrincipal Jwt jwt, @PathVariable long itemId,
                                @RequestBody @Valid AlterarQuantidade requisicao) {
        return service.alterar(jwt.getSubject(), itemId, requisicao.quantidade());
    }

    @DeleteMapping("/itens/{itemId}")
    public ResponseEntity<Void> remover(@AuthenticationPrincipal Jwt jwt, @PathVariable long itemId) {
        service.remover(jwt.getSubject(), itemId);
        return ResponseEntity.noContent().build();
    }
}
