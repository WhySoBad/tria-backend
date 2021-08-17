import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ChatMember } from '../entities/ChatMember.entity';
import { TokenPayload } from '../modules/Auth/Jwt/Jwt.interface';
import { JwtService } from '../modules/Auth/Jwt/Jwt.service';
import { GroupRole, Permission } from '../modules/Chat/Chat.interface';
import { ChatService } from '../modules/Chat/Chat.service';

@Injectable()
class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private chatService: ChatService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token: string | undefined = request.headers.authorization;
    if (!token) throw new BadRequestException('Missing Token');
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) throw new BadRequestException('Invalid Token');

    const chatUuid: string = request.params.uuid;
    const permissions: Array<Permission> = this.reflector.get<Array<Permission>>(
      'permissions',
      context.getHandler()
    );

    const member: ChatMember | undefined = await this.chatService.getMember(chatUuid, payload.user);
    if (!member || member.role === GroupRole.MEMBER) {
      throw new UnauthorizedException('Lacking Permissions');
    } else if (member.role === GroupRole.ADMIN) {
      let hasPermission: boolean = false;
      await Promise.all(
        permissions.map(async (permission: Permission) => {
          if (await this.chatService.hasPermission(member, permission)) hasPermission = true;
        })
      );
      if (!hasPermission) throw new UnauthorizedException('Lacking Permissions');
      else return true;
    } else return true;
  }
}

export default PermissionGuard;
