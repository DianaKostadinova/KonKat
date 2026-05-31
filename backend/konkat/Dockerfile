# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy Maven wrapper + pom first for dependency layer caching
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source and build (skip tests — tests run in CI, not inside Docker build)
COPY src/ src/
RUN ./mvnw package -DskipTests -B

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root user for security
RUN addgroup -S konkat && adduser -S konkat -G konkat
USER konkat

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8082

ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=docker", "app.jar"]
