import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { WorkerRuntime } from "./worker-runtime.service.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
  ],
  providers: [WorkerRuntime],
})
export class AppModule {}
