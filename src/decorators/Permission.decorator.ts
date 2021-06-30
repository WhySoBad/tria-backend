import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import AuthGuard from '../guards/AuthGuard.guard';
import PermissionGuard from '../guards/PermissionGuard.guard';
import { Permission } from '../modules/Chat/Chat.interface';

const Permissions = (...permissions: Array<Permission>) => {
  return applyDecorators(
    SetMetadata('permissions', permissions),
    UseGuards(AuthGuard, PermissionGuard)
  );
};

export default Permissions;
