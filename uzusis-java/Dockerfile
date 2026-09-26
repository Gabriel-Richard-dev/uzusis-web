# syntax=docker/dockerfile:1
# Uma imagem com os 6 serviços; o compose escolhe o jar por MODULO.
# Um único `mvn package` (em vez de um por serviço) e um lib/ compartilhado:
# as bibliotecas não se repetem 6 vezes nem no build nem na imagem.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY . .
RUN --mount=type=cache,target=/root/.m2 \
    MAVEN_OPTS=-Xmx1g mvn -B -q -Dmaven.test.skip=true package \
 && for m in gateway catalog-service order-service payment-service notification-service identity-service; do \
      java -Djarmode=tools -jar $m/target/$m-*.jar extract --force \
        --destination /out --libraries lib --application-filename $m.jar || exit 1; \
    done

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S -G app app
COPY --from=build /out/ /app/
USER app
ENV MODULO=gateway
ENTRYPOINT ["sh", "-c", "exec java -jar /app/${MODULO}.jar"]
