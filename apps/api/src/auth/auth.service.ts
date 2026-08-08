import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { prisma } from '@sapls/database';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(AuthService.name);

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  async register(data: any) {
    const { email, password, name, collegeId, role, departmentId, semester } = data;

    // 1. Register in Supabase Auth
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, name, collegeId },
    });

    if (authError) {
      this.logger.error(`Supabase auth error: ${authError.message}`);
      throw new BadRequestException(authError.message);
    }

    const supabaseId = authData.user.id;

    // 2. Create in Prisma DB
    try {
      const user = await prisma.user.create({
        data: {
          supabaseId,
          email,
          collegeId,
          name,
          role,
        },
      });

      if (role === 'STUDENT') {
        await prisma.student.create({
          data: {
            userId: user.id,
            departmentId,
            semester,
          },
        });
      } else if (role === 'TEACHER') {
        await prisma.teacher.create({
          data: {
            userId: user.id,
            departmentId,
          },
        });
      }

      return { message: 'Registration successful', userId: user.id };
    } catch (dbError: any) {
      this.logger.error(`Database error: ${dbError.message}`);
      // Rollback Supabase user
      await this.supabase.auth.admin.deleteUser(supabaseId);
      throw new BadRequestException('Failed to create user record');
    }
  }

  async login(data: any) {
    const { email, password } = data;
    
    // We use the regular auth client for login to get the user's JWT
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    const { data: authData, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      user: authData.user,
    };
  }
}
