import { Controller, Get } from '@nestjs/common';
import { readFileSync } from 'fs';
import { config } from './config';

const startedAt: number = Date.now();

@Controller()
export class AppController {
  constructor() {}
  /**
   * Endpoint to get basic informations about the api
   *
   * @returns object
   */

  @Get()
  get(): object {
    const packageJson: Buffer = readFileSync(process.cwd() + '/package.json');
    const json: { [key: string]: any } = JSON.parse(packageJson.toString());

    return {
      version: json.version,
      description: json.description,
      website: config.website,
      onlineSince: startedAt,
    };
  }
}
