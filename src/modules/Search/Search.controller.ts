import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import Authorization from '../../decorators/Authorization.decorator';
import AuthGuard from '../../guards/AuthGuard.guard';
import { SearchDto } from '../../pipes/validation/SearchDto.dto';
import { TokenPayload } from '../Auth/Jwt/Jwt.interface';
import { ChatPreview } from '../Chat/Chat.interface';
import { UserPreview } from '../User/User.interface';
import { SearchService } from './Search.service';

/**
 * Search controller to search chats and users
 */

@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  /**
   * Route to search for users and chats
   *
   * @param payload token payload
   *
   * @param body search options
   *
   * @returns Promise<Array<ChatPreview | UserPreview>>
   */

  @Post('/')
  @UseGuards(AuthGuard)
  async search(
    @Authorization() payload: TokenPayload,
    @Body() body: SearchDto
  ): Promise<Array<ChatPreview | UserPreview>> {
    try {
      const results: Array<ChatPreview | UserPreview> = await this.searchService.handleSearch(
        payload,
        body
      );
      return results.slice(0, 50); //maximum amount of search results at once is 50
    } catch (exception) {
      throw exception;
    }
  }
}
