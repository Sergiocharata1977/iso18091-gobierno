import {
  resolvePostLoginDestination,
  resolvePostLoginRoute,
} from '@/lib/auth/postLoginRouting';

describe('postLoginRouting', () => {
  describe('resolvePostLoginRoute', () => {
    it('returns /noticias when user is null', () => {
      expect(resolvePostLoginRoute(null)).toBe('/noticias');
    });

    it('returns /super-admin for super_admin role', () => {
      expect(
        resolvePostLoginRoute({
          rol: 'super_admin',
          organization_id: 'org-1',
        })
      ).toBe('/super-admin');
    });

    it('returns /onboarding/empresa when user has no organization_id', () => {
      expect(
        resolvePostLoginRoute({
          rol: 'usuario',
          organization_id: null,
        })
      ).toBe('/onboarding/empresa');
    });

    it('returns /onboarding when first_login is true', () => {
      expect(
        resolvePostLoginRoute({
          rol: 'usuario',
          organization_id: 'org-1',
          first_login: true,
        })
      ).toBe('/onboarding');
    });

    it('returns /onboarding when is_first_login is true', () => {
      expect(
        resolvePostLoginRoute({
          rol: 'usuario',
          organization_id: 'org-1',
          is_first_login: true,
        })
      ).toBe('/onboarding');
    });

    it('returns /noticias when user belongs to an organization and is not first login', () => {
      expect(
        resolvePostLoginRoute({
          rol: 'usuario',
          organization_id: 'org-1',
          first_login: false,
          is_first_login: false,
        })
      ).toBe('/noticias');
    });

    it('returns /onboarding when onboarding is strategy_pending', () => {
      expect(
        resolvePostLoginRoute({
          id: 'user-1',
          rol: 'usuario',
          organization_id: 'org-1',
          onboarding_phase: 'strategy_pending',
          onboarding_owner_user_id: 'user-1',
          first_login: false,
        })
      ).toBe('/onboarding');
    });
  });

  describe('resolvePostLoginDestination', () => {
    it.each(['/login', '/register', '/pending'])(
      'ignores blocked returnUrl %s',
      returnUrl => {
        expect(
          resolvePostLoginDestination(
            {
              rol: 'usuario',
              organization_id: null,
            },
            returnUrl
          )
        ).toBe('/onboarding/empresa');
      }
    );

    it.each(['/login?x=1', '/register?redirect=/mi-sgc', '/pending?step=1'])(
      'ignores blocked returnUrl with querystring %s',
      returnUrl => {
        expect(
          resolvePostLoginDestination(
            {
              rol: 'usuario',
              organization_id: null,
            },
            returnUrl
          )
        ).toBe('/onboarding/empresa');
      }
    );

    it('forces bootstrap for user without organization even if returnUrl is valid', () => {
      expect(
        resolvePostLoginDestination(
          {
            rol: 'usuario',
            organization_id: null,
          },
          '/mi-sgc'
        )
      ).toBe('/onboarding/empresa');
    });

    it('forces /noticias for user with organization even if returnUrl is /mi-sgc', () => {
      expect(
        resolvePostLoginDestination(
          {
            rol: 'usuario',
            organization_id: 'org-1',
          },
          '/mi-sgc'
        )
      ).toBe('/noticias');
    });

    it('forces /onboarding for pending onboarding even if returnUrl is valid', () => {
      expect(
        resolvePostLoginDestination(
          {
            id: 'user-1',
            rol: 'usuario',
            organization_id: 'org-1',
            onboarding_phase: 'strategy_pending',
            onboarding_owner_user_id: 'user-1',
          },
          '/mi-sgc'
        )
      ).toBe('/onboarding');
    });

    it('allows a valid returnUrl for super_admin', () => {
      expect(
        resolvePostLoginDestination(
          {
            rol: 'super_admin',
            organization_id: 'org-1',
          },
          '/admin/auditoria'
        )
      ).toBe('/admin/auditoria');
    });

    it('ignores invalid returnUrl for super_admin and falls back to /super-admin', () => {
      expect(
        resolvePostLoginDestination(
          {
            rol: 'super_admin',
            organization_id: 'org-1',
          },
          'https://evil.com'
        )
      ).toBe('/super-admin');
    });

    it.each(['//evil.com/phish', 'mi-sgc', 'https://evil.com'])(
      'ignores invalid returnUrl %s',
      returnUrl => {
        expect(
          resolvePostLoginDestination(
            {
              rol: 'usuario',
              organization_id: null,
            },
            returnUrl
          )
        ).toBe('/onboarding/empresa');
      }
    );
  });
});
