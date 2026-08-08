import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES } from '@sapls/shared';

export const Roles = (...roles: string[]) => {
  return (target: any, key?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => {
    if (descriptor) {
      Reflect.defineMetadata('roles', roles, descriptor.value!);
      return descriptor;
    }
    Reflect.defineMetadata('roles', roles, target);
    return target;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) return false;
    const userRole = String(user.role).toUpperCase();
    return requiredRoles.map(r => String(r).toUpperCase()).includes(userRole);
  }
}
