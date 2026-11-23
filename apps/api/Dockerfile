# Multi-stage Java 21 build: Maven never runs in the runtime image.
# Render root directory: apps/api ; Dockerfile path defaults to ./Dockerfile relative to this root.
FROM eclipse-temurin:21-jdk-jammy AS builder
WORKDIR /workspace
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x ./mvnw
COPY src/ src/
RUN ./mvnw -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
# Limit Java heap and CPU demands on Render's 512 MB free instance.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60.0 -XX:InitialRAMPercentage=15.0 -XX:+UseSerialGC -XX:ActiveProcessorCount=1"
COPY --from=builder --chown=10001:10001 /workspace/target/ktob-api-0.1.0-SNAPSHOT.jar /app/ktob-api.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/ktob-api.jar"]
