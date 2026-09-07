# Uma imagem para todos os serviços: o módulo entra por ARG. Seis Dockerfiles
# quase idênticos é seis lugares para esquecer de atualizar a versão do JDK.
#
#   docker build --build-arg MODULO=catalog-service -t uzusis/catalog .
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src

# Os poms primeiro: enquanto as dependências não mudarem, o cache do Maven
# sobrevive à alteração de código.
COPY pom.xml .
COPY common/pom.xml common/
COPY catalog-service/pom.xml catalog-service/
COPY order-service/pom.xml order-service/
COPY payment-service/pom.xml payment-service/
COPY notification-service/pom.xml notification-service/
COPY identity-service/pom.xml identity-service/
COPY gateway/pom.xml gateway/
RUN mvn -B -q dependency:go-offline -DskipTests || true

COPY . .
ARG MODULO
RUN mvn -B -q -pl ${MODULO} -am package -DskipTests \
    && cp ${MODULO}/target/*.jar /app.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
