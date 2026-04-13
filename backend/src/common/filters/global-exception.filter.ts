import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errors = (exceptionResponse as any).errors || null;
        // Handle class-validator array of messages
        if (Array.isArray(message)) {
          errors = message;
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      // Handle unique constraint violations
      if ((exception as any).code === '23505') {
        message = 'A record with this value already exists';
        status = HttpStatus.CONFLICT;
      } else {
        message = 'Database query failed';
      }
      this.logger.error(`DB Error: ${exception.message}`, exception.stack);
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled Error: ${exception.message}`, exception.stack);
    }

    // Log 5xx errors
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });
  }
}
