# Stage 1: build the fat jar with Maven
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
# Download dependencies first so they are cached when only source changes.
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

# Stage 2: minimal JRE runtime
FROM eclipse-temurin:21-jre
WORKDIR /app
# wget is used by the docker-compose healthcheck (not in the base image).
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/* && mkdir -p /tmp/pdfbound-uploads
COPY --from=build /app/target/pdfbound-backend-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
