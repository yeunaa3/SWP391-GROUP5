# Build React and serve it from the Spring Boot application (one HTTPS origin).
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /build/frontend
RUN npm install --global pnpm@10.15.1
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /build/backend
COPY backend/pom.xml ./
RUN mvn -B dependency:go-offline
COPY backend/src ./src
COPY --from=frontend-build /build/frontend/dist ./src/main/resources/static
RUN mvn -B package -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN groupadd --system pulse && useradd --system --gid pulse pulse && chown pulse:pulse /app
COPY --from=backend-build --chown=pulse:pulse /build/backend/target/premium-news-backend-0.0.1-SNAPSHOT.jar /app/app.jar
USER pulse
ENV SPRING_PROFILES_ACTIVE=prod,render
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65.0"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
