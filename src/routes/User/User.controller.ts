import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
} from '@nestjs/common';
import { User } from '../../entities/User.entity';
import { HandleService } from '../../util/Types.type';
import { IPendingUser, IUser } from './User.interface';
import { UserService } from './User.service';

/**
 * @description user route to create, verify, modify and delete users
 * @introduced 15.02.2021
 * @edited 17.02.2021
 */

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * @param user request body of type IPendingUser
   * @description route to register new user
   * @introduced 15.02.2021
   * @edited 17.02.2021
   */

  @Post('register')
  async register(@Body() user: IPendingUser): Promise<void> {
    const settings: IPendingUser = {
      name: user.name,
      tag: user.tag,
      mail: user.mail,
      password: user.password,
      avatar: user.avatar,
      description: user.description,
      locale: user.locale,
    };
    Object.keys(settings).forEach((key: string) => {
      if (!settings[key as keyof IPendingUser]) {
        throw new BadRequestException('Missing Arguments');
      }
    });
    const registered: HandleService<void> = await this.userService.handleRegister(
      settings,
    );
    if (registered instanceof HttpException) throw registered;
  }

  /**
   * @param uuid uuid of PendingUser
   * @description route to verify a PendingUser
   * @introduced 15.02.2021
   * @edited 17.02.2021
   */

  @Get('verify/:uuid')
  async verify(
    @Param('uuid', new ParseUUIDPipe())
    uuid: string,
  ): Promise<void> {
    const verified: HandleService<void> = await this.userService.handleVerify(
      uuid,
    );
    if (verified instanceof HttpException) throw verified;
  }

  /**
   * @param user request body of type IUser
   * @param request request instance
   * @description route to edit an user
   * @introduced 15.02.2021
   * @edited 17.02.2021
   */

  @Post('edit')
  async edit(@Body() user: IUser, @Request() request: Request): Promise<void> {
    const headers: Headers = request.headers;
    const token: string = headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    if (!user) throw new BadRequestException('No Arguments Provided');
    const settings: IUser = {
      name: user.name,
      tag: user.tag,
      avatar: user.avatar,
      description: user.description,
      locale: user.locale,
    };
    Object.keys(settings).forEach((key: string) => {
      !settings[key as keyof IUser] && delete settings[key as keyof IUser];
    });
    const edits: HandleService<void> = await this.userService.handleEdit(
      settings,
      token.replace('Bearer ', ''),
    );
    if (edits instanceof HttpException) throw edits;
  }

  /**
   * @param request request instance
   * @description route to delete an existing user
   * @introduced 15.02.2021
   * @edited 17.02.2021
   */

  @Get('delete')
  async delete(@Request() request: Request): Promise<void> {
    const headers: Headers = request.headers;
    const token: string = headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    const deleted: HandleService<void> = await this.userService.handleDelete(
      token.replace('Bearer ', ''),
    );
    if (deleted instanceof HttpException) throw deleted;
  }

  /**
   * @param request request instance
   * @param uuid uuid of User
   * @description route to get an user by its uuid
   * @introduced 15.02.2021
   * @edited 17.02.2021
   */

  @Get('get/:uuid')
  async get(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe())
    uuid: string,
  ): Promise<IUser> {
    const headers: Headers = request.headers;
    const token: string = headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    const user: HandleService<User> = await this.userService.handleGet(
      uuid,
      token.replace('Bearer ', ''),
    );
    if (user instanceof HttpException) throw user;
    return {
      name: user.name,
      tag: user.tag,
      description: user.description,
      avatar: user.avatar,
      locale: user.locale,
    };
  }
}
