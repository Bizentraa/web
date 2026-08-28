import "reflect-metadata";

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { createLogger } from "@bizentra/observability";

import { AppModule } from "./app.module.js";
import { ApiExceptionFilter } from "./errors/api-exception.filter.js";

const logger = createLogger("bizentra-api");

function resolveAllowedOrigins(): Array<RegExp | string> {
  const configuredOrigins = process.env.ALLOWED_WEB_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins?.length) {
    return configuredOrigins;
  }

  return [/^http:\/\/localhost:\d+$/];
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  await app.register(helmet);
  await app.register(cors, {
    origin: resolveAllowedOrigins(),
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  const openApiConfig = new DocumentBuilder()
    .setTitle("Bizentra API")
    .setDescription("P0 Business foundation and appearance API")
    .setVersion("0.1.0")
    .addApiKey({ type: "apiKey", in: "header", name: "x-business-id" }, "business")
    .addApiKey({ type: "apiKey", in: "header", name: "x-user-id" }, "user")
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup("api/docs", app, openApiDocument);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  logger.info("API is ready", { port, docs: `http://localhost:${port}/api/docs` });
}

void bootstrap();
