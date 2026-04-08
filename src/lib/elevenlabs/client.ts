// ElevenLabs API Client for Text-to-Speech

import { VoiceConfigurationService } from './voice-config';

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId?: string;
}

export interface TextToSpeechOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface TextToSpeechResult {
  audio: ArrayBuffer;
  latencyMs: number;
  characterCount: number;
  voiceId: string;
}

export class ElevenLabsService {
  private static apiKey: string | null = null;
  private static defaultVoiceId: string = 'kulszILr6ees0ArU8miO'; // Don Candido I (custom voice)
  private static fallbackVoiceId: string = 'pNInz6obpgDQGcFmaJgB'; // Adam (default ElevenLabs voice)

  /**
   * Initialize ElevenLabs client
   */
  private static initialize(): void {
    if (this.apiKey) {
      return;
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not set');
    }

    this.apiKey = apiKey;
    console.log('[ElevenLabsService] Initialized');
  }

  /**
   * Convert text to speech with enhanced configuration and logging
   */
  static async textToSpeech(
    options: TextToSpeechOptions
  ): Promise<ArrayBuffer> {
    this.initialize();

    const startTime = Date.now();

    // Get custom voice configuration
    const voiceConfig = VoiceConfigurationService.getCustomVoiceConfig();

    const {
      text,
      voiceId = voiceConfig.voiceId,
      modelId = 'eleven_multilingual_v2',
      stability = voiceConfig.stability,
      similarityBoost = voiceConfig.similarityBoost,
      style = voiceConfig.style,
      useSpeakerBoost = voiceConfig.useSpeakerBoost,
    } = options;

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    try {
      console.log('[ElevenLabsService] Converting text to speech...');
      console.log('[ElevenLabsService] Text length:', text.length);
      console.log('[ElevenLabsService] Voice ID:', voiceId);
      console.log('[ElevenLabsService] Voice settings:', {
        stability,
        similarityBoost,
        style,
        useSpeakerBoost,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey!,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: useSpeakerBoost,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API Error: ${response.status} ${error}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const latencyMs = Date.now() - startTime;

      console.log('[ElevenLabsService] Audio generated successfully');
      console.log(
        '[ElevenLabsService] Audio size:',
        audioBuffer.byteLength,
        'bytes'
      );
      console.log('[ElevenLabsService] Latency:', latencyMs, 'ms');
      console.log('[ElevenLabsService] Characters:', text.length);

      return audioBuffer;
    } catch (error) {
      console.error('[ElevenLabsService] Error:', error);

      // Try fallback to default voice if custom voice fails
      if (voiceId !== this.fallbackVoiceId) {
        console.warn(
          '[ElevenLabsService] Attempting fallback to default voice...'
        );
        try {
          return await this.textToSpeechWithFallback(text, {
            ...options,
            voiceId: this.fallbackVoiceId,
          });
        } catch (fallbackError) {
          console.error(
            '[ElevenLabsService] Fallback also failed:',
            fallbackError
          );
          throw error; // Throw original error
        }
      }

      throw error;
    }
  }

  /**
   * Fallback text-to-speech with default voice
   */
  private static async textToSpeechWithFallback(
    text: string,
    options: TextToSpeechOptions
  ): Promise<ArrayBuffer> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${options.voiceId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey!,
      },
      body: JSON.stringify({
        text,
        model_id: options.modelId || 'eleven_multilingual_v2',
        voice_settings: {
          stability: options.stability || 0.5,
          similarity_boost: options.similarityBoost || 0.75,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API Error: ${response.status} ${error}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(
      '[ElevenLabsService] Fallback audio generated:',
      audioBuffer.byteLength,
      'bytes'
    );

    return audioBuffer;
  }

  /**
   * Get available voices
   */
  static async getVoices(): Promise<unknown[]> {
    this.initialize();

    const url = 'https://api.elevenlabs.io/v1/voices';

    try {
      const response = await fetch(url, {
        headers: {
          'xi-api-key': this.apiKey!,
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('[ElevenLabsService] Error getting voices:', error);
      throw error;
    }
  }

  /**
   * Set default voice ID
   */
  static setDefaultVoice(voiceId: string): void {
    this.defaultVoiceId = voiceId;
  }

  /**
   * Get current voice configuration
   */
  static getVoiceConfig() {
    return VoiceConfigurationService.getCustomVoiceConfig();
  }
}
