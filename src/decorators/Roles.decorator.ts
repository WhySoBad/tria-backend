import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import AuthGuard from '../guards/AuthGuard.guard';
import RoleGuard from '../guards/RoleGuard.guard';
import { GroupRole } from '../modules/Chat/Chat.interface';

const Roles = (...roles: Array<GroupRole>) => {
  return applyDecorators(SetMetadata('roles', roles), UseGuards(AuthGuard, RoleGuard));
};

export default Roles;
