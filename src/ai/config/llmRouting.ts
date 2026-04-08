import type {
  LLMCapability,
  LLMCapabilityRouteConfig,
  LLMMode,
  LLMProvider,
  LLMProviderRouteConfig,
  LLMRouterConfig,
} from '@/ai/types/LLMRouterTypes';
import { ClaudeService } from '@/lib/claude/client';

const PROVIDER_ORDER: LLMProvider[] = ['groq', 'claude'];

const CAPABILITIES: LLMCapability[] = [
  'chat_general',
  'audit_eval',
  'doc_gen',
  'agent_ops',
];

const DEFAULT_CAPABILITY_MODELS: Record<
  LLMCapability,
  { primary: LLMProviderRouteConfig; fallbacks: LLMProviderRouteConfig[] }
> = {
  chat_general: {
    primary: {
      provider: 'groq',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      enabled: true,
    },
    fallbacks: [
      {
        provider: 'claude',
        model: getClaudeModelSafe(),
        enabled: true,
      },
    ],
  },
  audit_eval: {
    primary: {
      provider: 'claude',
      model: getClaudeModelSafe(),
      enabled: true,
    },
    fallbacks: [
      {
        provider: 'groq',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        enabled: true,
      },
    ],
  },
  doc_gen: {
    primary: {
      provider: 'claude',
      model: getClaudeModelSafe(),
      enabled: true,
    },
    fallbacks: [
      {
        provider: 'groq',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        enabled: true,
      },
    ],
  },
  agent_ops: {
    primary: {
      provider: 'groq',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      enabled: true,
    },
    fallbacks: [
      {
        provider: 'claude',
        model: getClaudeModelSafe(),
        enabled: true,
      },
    ],
  },
};

function getClaudeModelSafe(): string {
  try {
    return ClaudeService.getModel();
  } catch {
    return process.env.NEXT_PUBLIC_CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
  }
}

function normalizeProvider(value?: string | null): LLMProvider | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'groq' || normalized === 'claude') {
    return normalized;
  }
  return null;
}

function parseBooleanEnv(
  value: string | undefined,
  fallback: boolean = true
): boolean {
  if (value == null || value.trim() === '') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parseProviderListEnv(value?: string): LLMProvider[] {
  if (!value) {
    return [];
  }
  const parsed = value
    .split(',')
    .map(item => normalizeProvider(item))
    .filter((provider): provider is LLMProvider => provider !== null);

  return [...new Set(parsed)];
}

function buildRouteConfigForCapability(
  capability: LLMCapability
): LLMCapabilityRouteConfig {
  const base = DEFAULT_CAPABILITY_MODELS[capability];
  const capabilityEnvKey = capability.toUpperCase();

  const primaryOverride = normalizeProvider(
    process.env[`AI_ROUTER_CAP_${capabilityEnvKey}_PRIMARY`]
  );
  const fallbacksOverride = parseProviderListEnv(
    process.env[`AI_ROUTER_CAP_${capabilityEnvKey}_FALLBACKS`]
  );

  const providerToModel: Record<LLMProvider, string> = {
    groq: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    claude: getClaudeModelSafe(),
  };

  const providerEnabled: Record<LLMProvider, boolean> = {
    groq: parseBooleanEnv(process.env.AI_ROUTER_ENABLE_GROQ, true),
    claude: parseBooleanEnv(process.env.AI_ROUTER_ENABLE_CLAUDE, true),
  };

  const desiredOrder = (() => {
    if (primaryOverride) {
      const fallbackOrder =
        fallbacksOverride.length > 0
          ? fallbacksOverride.filter(provider => provider !== primaryOverride)
          : PROVIDER_ORDER.filter(provider => provider !== primaryOverride);
      return [primaryOverride, ...fallbackOrder];
    }

    if (fallbacksOverride.length > 0) {
      const primary = base.primary.provider;
      const sanitizedFallbacks = fallbacksOverride.filter(
        provider => provider !== primary
      );
      return [primary, ...sanitizedFallbacks];
    }

    return [base.primary.provider, ...base.fallbacks.map(f => f.provider)];
  })();

  const uniqueOrder = [...new Set(desiredOrder)];
  const [primaryProvider, ...fallbackProviders] = uniqueOrder;

  const toRoute = (provider: LLMProvider): LLMProviderRouteConfig => ({
    provider,
    model: providerToModel[provider],
    enabled: providerEnabled[provider],
  });

  return {
    capability,
    primary: toRoute(primaryProvider),
    fallbacks: fallbackProviders.map(toRoute),
  };
}

export function getLLMRouterConfig(): LLMRouterConfig {
  const capabilities = CAPABILITIES.reduce(
    (acc, capability) => {
      acc[capability] = buildRouteConfigForCapability(capability);
      return acc;
    },
    {} as Record<LLMCapability, LLMCapabilityRouteConfig>
  );

  return {
    capabilities,
    providers: {
      groq: {
        provider: 'groq',
        envKey: 'GROQ_API_KEY',
        featureFlagEnv: 'AI_ROUTER_ENABLE_GROQ',
        latency: '2-3 segundos',
        cost: 'Muy bajo',
        quality: 'Alta',
      },
      claude: {
        provider: 'claude',
        envKey: 'ANTHROPIC_API_KEY',
        featureFlagEnv: 'AI_ROUTER_ENABLE_CLAUDE',
        latency: '20-30 segundos',
        cost: 'Alto',
        quality: 'Muy alta',
      },
    },
    defaults: {
      modeToCapability: {
        fast: 'chat_general',
        quality: 'chat_general',
      },
      fallbackEnabled: parseBooleanEnv(
        process.env.AI_ROUTER_ENABLE_FALLBACK,
        true
      ),
    },
  };
}

export function mapModeToCapability(mode: LLMMode): LLMCapability {
  return getLLMRouterConfig().defaults.modeToCapability[mode];
}
