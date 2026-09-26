package br.ifce.uzusis.catalog.produto;

/**
 * Mesmos valores, mesma ordem do ECategoriaProduto da antiga API .NET. O front manda a
 * categoria como string e o admin já tem produtos cadastrados com elas — mudar
 * o conjunto aqui quebra a vitrine, não é refatoração.
 */
public enum CategoriaProduto {
    CALCA("Calça"),
    SHORT("Short"),
    SAIA("Saia"),
    CROPPED("Cropped"),
    CONJUNTOS("Conjuntos"),
    BLUSAO("Blusão"),
    BODY("Body"),
    BLUSA("Blusa"),
    ACESSORIOS("Acessórios");

    private final String nomeExibicao;

    CategoriaProduto(String nomeExibicao) {
        this.nomeExibicao = nomeExibicao;
    }

    public String getNomeExibicao() {
        return nomeExibicao;
    }
}
