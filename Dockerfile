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
COPY scripts/maven-build.sh /build/maven-build.sh
# Normalize Windows line endings before running this script in Linux.
RUN sed -i 's/\r$//' /build/maven-build.sh && sh /build/maven-build.sh dependency:go-offline
COPY backend/src ./src
COPY --from=frontend-build /build/frontend/dist ./src/main/resources/static
RUN sh /build/maven-build.sh package -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN groupadd --system pulse && useradd --system --gid pulse pulse && chown pulse:pulse /app
COPY --from=backend-build --chown=pulse:pulse /build/backend/target/premium-news-backend-0.0.1-SNAPSHOT.jar /app/app.jar
# Aiven uses a project CA. Keep the default trust roots for other HTTPS services.
COPY deploy/certs/aiven-ca.pem /tmp/aiven-ca.pem
RUN keytool -importcert -trustcacerts -noprompt -alias aiven-mysql -file /tmp/aiven-ca.pem -cacerts -storepass changeit
USER pulse
ENV SPRING_PROFILES_ACTIVE=prod,render
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65.0"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
