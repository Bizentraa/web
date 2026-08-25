import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, HttpStatus } from "@nestjs/common";
import { BusinessAccessError } from "@bizentra/domain-business-access";
import type { FastifyReply } from "fastify";
import { ZodError } from "zod";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();

    if (exception instanceof ZodError) {
      void response.status(HttpStatus.BAD_REQUEST).send({
        code: "VALIDATION_ERROR",
        message: "The request contains invalid or missing information.",
        details: exception.issues,
      });
      return;
    }

    if (exception instanceof BusinessAccessError) {
      const statusByCode = {
        NOT_FOUND: HttpStatus.NOT_FOUND,
        FORBIDDEN: HttpStatus.FORBIDDEN,
        CONFLICT: HttpStatus.CONFLICT,
        INVALID_INPUT: HttpStatus.BAD_REQUEST,
      } as const;
      void response.status(statusByCode[exception.code]).send({
        code: exception.code,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof HttpException) {
      void response.status(exception.getStatus()).send({
        code: "HTTP_ERROR",
        message: exception.message,
        details: exception.getResponse(),
      });
      return;
    }

    console.error(exception);
    void response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
    });
  }
}
