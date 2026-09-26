package br.ifce.uzusis.catalog.produto;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class FotoServiceTest {

    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D};
    private static final byte[] WEBP = "RIFF\0\0\0\0WEBPVP8 ".getBytes(StandardCharsets.ISO_8859_1);

    ProdutoRepository produtos = mock(ProdutoRepository.class);
    MinioClient minio = mock(MinioClient.class);
    FotoService service = new FotoService(produtos, minio, "produtos", "/storage");
    Produto produto = new Produto("Blusa", new BigDecimal("10.00"), "Descrição", CategoriaProduto.BLUSA);

    @BeforeEach
    void produtoExistente() {
        ReflectionTestUtils.setField(produto, "id", 42L);
        when(produtos.travarPorId(42L)).thenReturn(Optional.of(produto));
    }

    @Test
    void aceita_jpeg_png_e_webp_pelos_bytes_e_grava_com_o_tipo_detectado() throws Exception {
        var jpeg = service.enviar(42L, JPEG);
        var png = service.enviar(42L, PNG);
        var webp = service.enviar(42L, WEBP);

        assertThat(jpeg.url()).matches("/storage/produtos/42/[0-9a-f]{32}\\.jpg");
        assertThat(png.url()).endsWith(".png");
        assertThat(webp.url()).endsWith(".webp");
        assertThat(List.of(jpeg.ordem(), png.ordem(), webp.ordem())).containsExactly(0, 1, 2);

        var gravados = ArgumentCaptor.forClass(PutObjectArgs.class);
        verify(minio, times(3)).putObject(gravados.capture());
        assertThat(gravados.getAllValues()).extracting(PutObjectArgs::contentType)
                .containsExactly("image/jpeg", "image/png", "image/webp");
        assertThat(gravados.getAllValues().get(0).bucket()).isEqualTo("produtos");
        assertThat("/storage/produtos/" + gravados.getAllValues().get(0).object()).isEqualTo(jpeg.url());
    }

    @Test
    void texto_renomeado_para_png_e_recusado_sem_tocar_no_minio() {
        assertThatThrownBy(() -> service.enviar(42L, "não sou imagem".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> {
                    assertThat(e.getStatusCode().value()).isEqualTo(415);
                    assertThat(e.getReason()).isEqualTo("Formato não suportado. Envie JPEG, PNG ou WEBP.");
                });
        verifyNoInteractions(minio);
    }

    @Test
    void setima_foto_e_recusada() throws Exception {
        for (int i = 0; i < 6; i++) {
            service.enviar(42L, PNG);
        }

        assertThatThrownBy(() -> service.enviar(42L, PNG))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> {
                    assertThat(e.getStatusCode().value()).isEqualTo(422);
                    assertThat(e.getReason()).isEqualTo("Limite de 6 fotos por produto.");
                });
        assertThat(produto.getFotos()).hasSize(6);
    }

    @Test
    void falha_ao_gravar_a_linha_apaga_o_objeto_enviado() throws Exception {
        doThrow(new IllegalStateException("banco fora")).when(produtos).flush();

        assertThatThrownBy(() -> service.enviar(42L, PNG)).isInstanceOf(IllegalStateException.class);

        var gravado = ArgumentCaptor.forClass(PutObjectArgs.class);
        var apagado = ArgumentCaptor.forClass(RemoveObjectArgs.class);
        verify(minio).putObject(gravado.capture());
        verify(minio).removeObject(apagado.capture());
        assertThat(apagado.getValue().object()).isEqualTo(gravado.getValue().object());
    }

    @Test
    void remover_recompacta_a_ordem_e_apaga_o_objeto() throws Exception {
        service.enviar(42L, PNG);
        service.enviar(42L, PNG);
        service.enviar(42L, PNG);
        var fotos = produto.getFotos();
        for (int i = 0; i < fotos.size(); i++) {
            ReflectionTestUtils.setField(fotos.get(i), "id", 10L + i);
        }
        var chaveDoMeio = fotos.get(1).getChave();

        service.remover(42L, 11L);

        assertThat(produto.fotosEmOrdem()).extracting(Foto::getId).containsExactly(10L, 12L);
        assertThat(produto.fotosEmOrdem()).extracting(Foto::getOrdem).containsExactly(0, 1);
        var apagado = ArgumentCaptor.forClass(RemoveObjectArgs.class);
        verify(minio).removeObject(apagado.capture());
        assertThat(apagado.getValue().object()).isEqualTo(chaveDoMeio);
    }

    @Test
    void reordenar_exige_exatamente_as_fotos_do_produto() throws Exception {
        service.enviar(42L, PNG);
        service.enviar(42L, JPEG);
        ReflectionTestUtils.setField(produto.getFotos().get(0), "id", 7L);
        ReflectionTestUtils.setField(produto.getFotos().get(1), "id", 9L);

        assertThatThrownBy(() -> service.reordenar(42L, List.of(9L)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("A lista deve conter todas as fotos do produto.");
        assertThat(service.reordenar(42L, List.of(9L, 7L)))
                .extracting(ProdutoDtos.FotoResposta::id).containsExactly(9L, 7L);
        verify(minio, never()).removeObject(any());
    }
}
