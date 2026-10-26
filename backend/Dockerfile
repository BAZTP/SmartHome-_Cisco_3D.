FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Optional secrets support cloud proxies without embedding credentials.
RUN --mount=type=cache,target=/root/.m2/repository \
    --mount=type=cache,target=/workspace/.m2/repository \
    --mount=type=secret,id=maven_settings,target=/root/.m2/settings.xml \
    --mount=type=secret,id=java_cacerts,target=/tmp/java-cacerts \
    if [ -f /tmp/java-cacerts ]; then export MAVEN_OPTS=-Djavax.net.ssl.trustStore=/tmp/java-cacerts; fi; \
    mvn -B -DskipTests package
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/simulator-0.1.0.jar app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
