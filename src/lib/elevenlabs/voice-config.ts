// Voice Configuration Service for ElevenLabs

export interface VoiceConfig {
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

export class VoiceConfigurationService {
  private static config: VoiceConfig | null = null;

  /**
   * Get custom voice configuration from environment variables
   */
  static getCustomVoiceConfig(): VoiceConfig {
    if (this.config) {
      return this.config;
    }

    // Load from environment variables
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'kulszILr6ees0ArU8miO';
    const stability = parseFloat(
      process.env.ELEVENLABS_VOICE_STABILITY || '0.5'
    );
    const similarityBoost = parseFloat(
      process.env.ELEVENLABS_VOICE_SIMILARITY || '0.75'
    );
    const style = parseFloat(process.env.ELEVENLABS_VOICE_STYLE || '0.0');
    const useSpeakerBoost = process.env.ELEVENLABS_SPEAKER_BOOST === 'true';

    this.config = {
      voiceId,
      stability,
      similarityBoost,
      style,
      useSpeakerBoost,
    };

    console.log('[VoiceConfigurationService] Loaded configuration:', {
      voiceId,
      stability,
      similarityBoost,
      style,
      useSpeakerBoost,
    });

    return this.config;
  }

  /**
   * Update voice configuration (for runtime changes)
   */
  static updateVoiceConfig(config: Partial<VoiceConfig>): void {
    const currentConfig = this.getCustomVoiceConfig();
    this.config = {
      ...currentConfig,
      ...config,
    };

    console.log(
      '[VoiceConfigurationService] Updated configuration:',
      this.config
    );
  }

  /**
   * Reset configuration to environment defaults
   */
  static resetToDefaults(): void {
    this.config = null;
    console.log('[VoiceConfigurationService] Reset to defaults');
  }

  /**
   * Validate voice configuration
   */
  static validateConfig(config: VoiceConfig): boolean {
    if (!config.voiceId || config.voiceId.trim() === '') {
      console.error('[VoiceConfigurationService] Invalid voiceId');
      return false;
    }

    if (config.stability < 0 || config.stability > 1) {
      console.error(
        '[VoiceConfigurationService] Stability must be between 0 and 1'
      );
      return false;
    }

    if (config.similarityBoost < 0 || config.similarityBoost > 1) {
      console.error(
        '[VoiceConfigurationService] Similarity boost must be between 0 and 1'
      );
      return false;
    }

    if (config.style < 0 || config.style > 1) {
      console.error(
        '[VoiceConfigurationService] Style must be between 0 and 1'
      );
      return false;
    }

    return true;
  }
}
