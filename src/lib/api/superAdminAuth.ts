import { WithAuthOptions } from '@/lib/api/withAuth';

export const SUPER_ADMIN_AUTH_OPTIONS: WithAuthOptions = {
  roles: ['super_admin'],
  allowInactive: true,
};
