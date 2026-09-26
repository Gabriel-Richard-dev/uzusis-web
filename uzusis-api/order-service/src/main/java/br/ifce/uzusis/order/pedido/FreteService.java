package br.ifce.uzusis.order.pedido;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

/** Frete por UF ({@code FRETE_POR_UF}), senão o padrão ({@code FRETE_PADRAO}). Sempre calculado aqui, nunca pelo cliente. */
@Service
public class FreteService {

    private final BigDecimal padrao;
    private final Map<String, BigDecimal> porUf;

    public FreteService(@Value("${uzusis.frete.padrao}") BigDecimal padrao,
                        @Value("${uzusis.frete.por-uf:}") String porUf) {
        this.padrao = PedidoDtos.reais(padrao);
        this.porUf = interpretar(porUf);
    }

    public BigDecimal valor(String uf) {
        if (uf == null || !uf.matches(EnderecoEntrega.UF)) {
            throw new ResponseStatusException(BAD_REQUEST, "UF inválida");
        }
        return porUf.getOrDefault(uf.toUpperCase(), padrao);
    }

    /** {@code "CE=10.00,SP=25"}. Configuração errada derruba o boot em vez de cobrar frete errado. */
    private static Map<String, BigDecimal> interpretar(String config) {
        var valores = new HashMap<String, BigDecimal>();
        for (var par : config.split(",")) {
            if (par.isBlank()) {
                continue;
            }
            var partes = par.split("=");
            if (partes.length != 2 || !partes[0].trim().matches(EnderecoEntrega.UF)) {
                throw new IllegalArgumentException("FRETE_POR_UF inválido (use UF=valor[,UF=valor]): " + config);
            }
            valores.put(partes[0].trim().toUpperCase(), PedidoDtos.reais(new BigDecimal(partes[1].trim())));
        }
        return valores;
    }
}
