package br.ifce.uzusis.catalog.produto;

/**
 * Mesmos valores, mesma ordem do ECategoriaProduto do .NET. O front manda a
 * categoria como string e o admin já tem produtos cadastrados com elas — mudar
 * o conjunto aqui quebra a vitrine, não é refatoração.
 */
public enum CategoriaProduto {
    CALCA,
    SHORT,
    SAIA,
    CROPPED,
    CONJUNTOS,
    BLUSAO,
    BODY,
    BLUSA,
    ACESSORIOS
}
