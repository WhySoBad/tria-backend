import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
} from '@nestjs/common';
import { IGroupChat, IPrivateChat } from './Chat.interface';
import { ChatService } from './Chat.service';

@Controller('chats')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('create/private')
  async createPrivate(
    @Request() request: Request,
    @Body() chat: IPrivateChat,
  ): Promise<void> {
    const headers: Headers = request.headers;
    const token: string = headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    if (!chat) throw new BadRequestException('No Arguments Provided');
    const settings: IPrivateChat = {
      user: chat.user,
    };
    if (!settings.user) throw new BadRequestException('User Has To Be Given');
    await this.chatService.handlePrivateCreate(
      settings,
      token.replace('Bearer ', ''),
    );
  }

  @Post('create/group')
  async createGroup(
    @Request() request: Request,
    @Body() chat: IGroupChat,
  ): Promise<void> {
    const headers: Headers = request.headers;
    const token: string = headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    if (!chat) throw new BadRequestException('No Arguments Provided');
    const settings: IGroupChat = {
      name: chat.name,
      tag: chat.tag,
      description: chat.description,
      members: chat.members,
    };
    Object.keys(settings).forEach((key: string) => {
      !settings[key as keyof IGroupChat] &&
        delete settings[key as keyof IGroupChat];
    });
    await this.chatService.handleGroupCreate(
      settings,
      token.replace('Bearer ', ''),
    );
  }

  @Post(':uuid/edit')
  async edit(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe())
    uuid: string,
  ): Promise<void> {
    await this.chatService.handleEdit();
  }

  @Get(':uuid/join')
  async join(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe())
    uuid: string,
  ): Promise<void> {
    await this.chatService.handleJoin();
  }

  @Get(':uuid/leave')
  async leave(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe())
    uuid: string,
  ): Promise<void> {
    await this.chatService.handleLeave();
  }

  @Get(':uuid/delete')
  async delete(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe())
    uuid: string,
  ): Promise<void> {
    await this.chatService.handleDelete();
  }

  @Post(':uuid/admin/ban')
  async ban(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe())
    uuid: string,
  ): Promise<void> {
    await this.chatService.handleBan();
  }

  @Post(':uuid/admin/kick')
  async kick(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe())
    uuid: string,
  ): Promise<void> {
    await this.chatService.handleKick();
  }

  @Get('get/:uuid')
  async get(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe())
    uuid: string,
  ): Promise<void> {
    await this.chatService.handleGet();
  }
}
