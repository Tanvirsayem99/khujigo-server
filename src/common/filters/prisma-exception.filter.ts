import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Translates Prisma's error codes into meaningful HTTP responses. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Unexpected database error';

    switch (exception.code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const target = exception.meta?.target;
        const fields = Array.isArray(target)
          ? target.join(', ')
          : String(target ?? '');
        message = fields
          ? `A record with this ${fields} already exists`
          : 'A record with these values already exists';
        break;
      }
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Operation violates a related-record constraint';
        break;
      default:
        this.logger.error(
          `Unhandled Prisma error ${exception.code}: ${exception.message}`,
        );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.code,
    });
  }
}
