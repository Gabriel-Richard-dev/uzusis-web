package br.ifce.uzusis.catalog.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MinioConfig {

    /** Não abre conexão no boot: o serviço sobe mesmo com o MinIO fora do ar. */
    @Bean
    MinioClient minioClient(@Value("${uzusis.minio.endpoint}") String endpoint,
                            @Value("${uzusis.minio.access-key}") String accessKey,
                            @Value("${uzusis.minio.secret-key}") String secretKey) {
        return MinioClient.builder().endpoint(endpoint).credentials(accessKey, secretKey).build();
    }
}
