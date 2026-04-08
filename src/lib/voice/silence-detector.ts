// Silence Detection for Voice Activity Detection (VAD)

export interface SilenceDetectorConfig {
  threshold: number; // Audio level threshold (0-255)
  duration: number; // Milliseconds of silence to detect
  sampleRate: number; // Audio sample rate
}

export interface SilenceDetectionResult {
  isSilent: boolean;
  audioLevel: number;
  timestamp: number;
}

export class SilenceDetector {
  private config: SilenceDetectorConfig;
  private silenceStartTime: number | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;
  private onSilenceDetected: (() => void) | null = null;
  private onVoiceActivity: (() => void) | null = null;
  private isCurrentlySilent: boolean = false;

  constructor(config?: Partial<SilenceDetectorConfig>) {
    this.config = {
      threshold: config?.threshold ?? 30, // Default threshold
      duration: config?.duration ?? 1500, // 1.5 seconds of silence
      sampleRate: config?.sampleRate ?? 44100,
    };

    console.log('[SilenceDetector] Initialized with config:', this.config);
  }

  /**
   * Start detecting silence from audio stream
   */
  async startDetection(
    stream: MediaStream,
    onSilence: () => void,
    onVoice: () => void
  ): Promise<void> {
    this.onSilenceDetected = onSilence;
    this.onVoiceActivity = onVoice;

    // Create audio context
    this.audioContext = new AudioContext({
      sampleRate: this.config.sampleRate,
    });

    // Create analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Connect stream to analyser
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);

    // Create data array for audio samples
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    console.log('[SilenceDetector] Detection started');

    // Start monitoring
    this.monitorAudioLevel();
  }

  /**
   * Stop detecting silence
   */
  stopDetection(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    this.silenceStartTime = null;
    this.isCurrentlySilent = false;

    console.log('[SilenceDetector] Detection stopped');
  }

  /**
   * Monitor audio level continuously
   */
  private monitorAudioLevel(): void {
    if (!this.analyser || !this.dataArray) {
      return;
    }

    // Get audio data
    // @ts-expect-error - TypeScript issue with Uint8Array types
    this.analyser.getByteTimeDomainData(this.dataArray);

    // Calculate average audio level
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const value = Math.abs(this.dataArray[i] - 128);
      sum += value;
    }
    const average = sum / this.dataArray.length;

    const now = Date.now();

    // Check if audio level is below threshold (silence)
    if (average < this.config.threshold) {
      if (this.silenceStartTime === null) {
        this.silenceStartTime = now;
        console.log('[SilenceDetector] Silence started');
      } else {
        const silenceDuration = now - this.silenceStartTime;

        // If silence duration exceeds threshold, trigger callback
        if (
          silenceDuration >= this.config.duration &&
          !this.isCurrentlySilent
        ) {
          this.isCurrentlySilent = true;
          console.log(
            '[SilenceDetector] Silence detected after',
            silenceDuration,
            'ms'
          );
          if (this.onSilenceDetected) {
            this.onSilenceDetected();
          }
        }
      }
    } else {
      // Voice activity detected
      if (this.silenceStartTime !== null) {
        console.log('[SilenceDetector] Voice activity detected');
        this.silenceStartTime = null;

        if (this.isCurrentlySilent) {
          this.isCurrentlySilent = false;
          if (this.onVoiceActivity) {
            this.onVoiceActivity();
          }
        }
      }
    }

    // Continue monitoring
    this.animationFrameId = requestAnimationFrame(() =>
      this.monitorAudioLevel()
    );
  }

  /**
   * Auto-calibrate threshold based on ambient noise
   */
  async calibrate(
    stream: MediaStream,
    durationMs: number = 2000
  ): Promise<number> {
    console.log('[SilenceDetector] Starting calibration...');

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const samples: number[] = [];
    const startTime = Date.now();

    return new Promise(resolve => {
      const collectSamples = () => {
        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const value = Math.abs(dataArray[i] - 128);
          sum += value;
        }
        const average = sum / dataArray.length;
        samples.push(average);

        if (Date.now() - startTime < durationMs) {
          requestAnimationFrame(collectSamples);
        } else {
          // Calculate calibrated threshold (average + 20%)
          const avgNoise = samples.reduce((a, b) => a + b, 0) / samples.length;
          const calibratedThreshold = avgNoise * 1.2;

          console.log('[SilenceDetector] Calibration complete');
          console.log('[SilenceDetector] Average noise level:', avgNoise);
          console.log(
            '[SilenceDetector] Calibrated threshold:',
            calibratedThreshold
          );

          this.config.threshold = calibratedThreshold;

          audioContext.close();
          resolve(calibratedThreshold);
        }
      };

      collectSamples();
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SilenceDetectorConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
    console.log('[SilenceDetector] Config updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): SilenceDetectorConfig {
    return { ...this.config };
  }

  /**
   * Get current audio level (for UI visualization)
   */
  getCurrentAudioLevel(): number {
    if (!this.analyser || !this.dataArray) {
      return 0;
    }

    // @ts-expect-error - TypeScript issue with Uint8Array types
    this.analyser.getByteTimeDomainData(this.dataArray);

    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const value = Math.abs(this.dataArray[i] - 128);
      sum += value;
    }

    return sum / this.dataArray.length;
  }
}
