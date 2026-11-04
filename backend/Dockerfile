# syntax=docker/dockerfile:1

# ---- Stage 1: Build ----
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and download dependencies (cached layer)
COPY pom.xml .
RUN mvn -B -ntp dependency:resolve

# Copy source and build (run automated tests in the Maven build stage;
# production runtime stage stays a JRE image without Maven)
COPY src ./src
RUN mvn -B -ntp package

# ---- Stage 2: Run ----
FROM eclipse-temurin:17-jre
ARG APP_VERSION=dev

LABEL org.opencontainers.image.title="smart-heritage-backend" \
      org.opencontainers.image.description="Smart Heritage Spring Boot API" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.source="https://github.com/nahnht27/smart-heritage"

# curl is used by the health check (GET /api/health).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --home-dir /app --no-create-home \
         --shell /usr/sbin/nologin app

WORKDIR /app
COPY --chown=app:app --from=build /app/target/*.jar app.jar

# Run as an unprivileged user; the app only needs to read its jar and write logs.
USER app

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=12 \
  CMD curl -fsS http://localhost:8080/api/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
