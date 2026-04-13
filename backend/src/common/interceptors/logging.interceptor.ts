import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const start = Date.now();

    const { method, url, ip } = request;
    const userAgent = request.headers['user-agent'] || '';

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const statusCode = response.statusCode;
          this.logger.log(
            `${method} ${url} ${statusCode} ${duration}ms — ${ip} ${userAgent.slice(0, 50)}`,
          );
        },
        error: (err) => {
          const duration = Date.now() - start;
          this.logger.warn(
            `${method} ${url} ERR ${duration}ms — ${err.message?.slice(0, 100)}`,
          );
        },
      }),
    );
  }
}
