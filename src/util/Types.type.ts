import { HttpException } from '@nestjs/common';

export type HandleService<T> = T | HttpException;

export type DBResponse<T> = T | undefined;
