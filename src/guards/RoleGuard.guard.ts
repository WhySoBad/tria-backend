import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ChatMember } from '../entities/ChatMember.entity';
import { TokenPayload } from '../modules/Auth/Jwt/Jwt.interface';
import { JwtService } from '../modules/Auth/Jwt/Jwt.service';
import { GroupRole } from '../modules/Chat/Chat.interface';
import { ChatService } from '../modules/Chat/Chat.service';

@Injectable()
class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector, private chatService: ChatService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token: string | undefined = request.headers.authorization;
    if (!token) throw new BadRequestException('Missing Token');
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) throw new BadRequestException('Invalid Token');

    const chatUuid: string = request.params.uuid;
    const roles: Array<GroupRole> = this.reflector.get<Array<GroupRole>>(
      'roles',
      context.getHandler()
    );

    const member: ChatMember | undefined = await this.chatService.getMember(chatUuid, payload.user);
    if (!member) throw new NotFoundException('User Has To Be Member Of The Chat');
    if (member && roles.includes(GroupRole.MEMBER)) return true;
    if (member.role === GroupRole.OWNER) return true;
    let hasRole: boolean = false;
    roles.forEach((role: GroupRole) => {
      if (member.role === role) hasRole = true;
    });
    if (!hasRole) throw new UnauthorizedException('Lacking Permissions');
    else return true;
  }
}

export default RoleGuard;
