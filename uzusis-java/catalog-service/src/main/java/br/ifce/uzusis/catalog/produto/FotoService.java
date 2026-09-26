package br.ifce.uzusis.catalog.produto;

import br.ifce.uzusis.catalog.produto.ProdutoDtos.FotoResposta;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE;
import static org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY;
import static org.springframework.http.HttpStatus.UNSUPPORTED_MEDIA_TYPE;

/** Fotos no MinIO. O bucket é criado pelo minio-init do compose, não aqui. */
@Service
public class FotoService {

    private static final Logger log = LoggerFactory.getLogger(FotoService.class);
    static final int LIMITE_FOTOS = 6;
    static final int TAMANHO_MAXIMO = 5 * 1024 * 1024;

    private final ProdutoRepository produtos;
    private final MinioClient minio;
    private final String bucket;
    private final String prefixoPublico;

    public FotoService(ProdutoRepository produtos, MinioClient minio,
                       @Value("${uzusis.minio.bucket}") String bucket,
                       @Value("${uzusis.minio.public-prefix}") String prefixoPublico) {
        this.produtos = produtos;
        this.minio = minio;
        this.bucket = bucket;
        this.prefixoPublico = prefixoPublico;
    }

    /**
     * Valida, grava o objeto e só então a linha. O tipo vem dos bytes, nunca do
     * Content-Type ou da extensão do cliente: um .txt renomeado para .png é recusado.
     */
    @Transactional
    public FotoResposta enviar(long produtoId, byte[] conteudo) {
        var produto = travar(produtoId);
        var tipo = TipoImagem.detectar(conteudo);
        if (tipo == null) {
            throw new ResponseStatusException(UNSUPPORTED_MEDIA_TYPE, "Formato não suportado. Envie JPEG, PNG ou WEBP.");
        }
        if (conteudo.length > TAMANHO_MAXIMO) {
            throw new ResponseStatusException(PAYLOAD_TOO_LARGE, "Arquivo maior que 5 MB.");
        }
        if (produto.getFotos().size() >= LIMITE_FOTOS) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "Limite de 6 fotos por produto.");
        }

        var chave = produtoId + "/" + UUID.randomUUID().toString().replace("-", "") + "." + tipo.extensao;
        gravar(chave, conteudo, tipo.contentType);
        try {
            var foto = produto.adicionarFoto(prefixoPublico + "/" + bucket + "/" + chave, chave);
            produtos.flush();
            return FotoResposta.de(foto);
        } catch (RuntimeException e) {
            apagar(chave); // sem a linha, o objeto ficaria órfão no bucket
            throw e;
        }
    }

    /** Apaga a linha, recompacta a ordem e depois o objeto; falha no MinIO só vai para o log. */
    @Transactional
    public void remover(long produtoId, long fotoId) {
        var produto = travar(produtoId);
        var foto = produto.getFotos().stream()
                .filter(f -> Long.valueOf(fotoId).equals(f.getId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Foto não encontrada"));
        produto.removerFoto(foto);
        produtos.flush();
        if (foto.getChave() != null) {
            apagar(foto.getChave());
        }
    }

    /** {@code fotoIds} tem de ser exatamente as fotos do produto; a primeira vira a capa. */
    @Transactional
    public List<FotoResposta> reordenar(long produtoId, List<Long> fotoIds) {
        var produto = travar(produtoId);
        var atuais = new HashSet<Long>();
        produto.getFotos().forEach(f -> atuais.add(f.getId()));
        if (fotoIds.size() != atuais.size() || !atuais.equals(new HashSet<>(fotoIds))) {
            throw new ResponseStatusException(BAD_REQUEST, "A lista deve conter todas as fotos do produto.");
        }
        produto.getFotos().forEach(f -> f.definirOrdem(fotoIds.indexOf(f.getId())));
        return produto.fotosEmOrdem().stream().map(FotoResposta::de).toList();
    }

    private Produto travar(long produtoId) {
        return produtos.travarPorId(produtoId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Produto não encontrado"));
    }

    private void gravar(String chave, byte[] conteudo, String contentType) {
        try {
            minio.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(chave)
                    .stream(new ByteArrayInputStream(conteudo), conteudo.length, -1)
                    .contentType(contentType)
                    .build());
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao gravar a foto " + chave + " no MinIO", e);
        }
    }

    private void apagar(String chave) {
        try {
            minio.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(chave).build());
        } catch (Exception e) {
            log.warn("Não consegui apagar {} do MinIO; o objeto ficou órfão", chave, e);
        }
    }

    enum TipoImagem {
        JPEG("jpg", "image/jpeg"),
        PNG("png", "image/png"),
        WEBP("webp", "image/webp");

        final String extensao;
        final String contentType;

        TipoImagem(String extensao, String contentType) {
            this.extensao = extensao;
            this.contentType = contentType;
        }

        static TipoImagem detectar(byte[] b) {
            if (comeca(b, 0, 0xFF, 0xD8, 0xFF)) {
                return JPEG;
            }
            if (comeca(b, 0, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)) {
                return PNG;
            }
            if (comeca(b, 0, 'R', 'I', 'F', 'F') && comeca(b, 8, 'W', 'E', 'B', 'P')) {
                return WEBP;
            }
            return null;
        }

        private static boolean comeca(byte[] b, int inicio, int... esperado) {
            if (b.length < inicio + esperado.length) {
                return false;
            }
            for (int i = 0; i < esperado.length; i++) {
                if ((b[inicio + i] & 0xFF) != esperado[i]) {
                    return false;
                }
            }
            return true;
        }
    }
}
