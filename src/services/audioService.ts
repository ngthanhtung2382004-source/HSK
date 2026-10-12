// Web Speech API for Chinese pronunciation (zh-CN)
class AudioService {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  public rate: number = 0.85; // Slightly slower for clear tones

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prioritize high-quality Chinese voices
    this.voice =
      voices.find(v => v.lang === 'zh-CN' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('HiuGaai') || v.name.includes('Xiaoxiao'))) ||
      voices.find(v => v.lang === 'zh-CN') ||
      voices.find(v => v.lang.startsWith('zh')) ||
      null;
  }

  public speak(text: string, customRate?: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth) {
        resolve();
        return;
      }

      this.synth.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = customRate ?? this.rate;
      utterance.pitch = 1.0;

      if (this.voice) {
        utterance.voice = this.voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      this.synth.speak(utterance);
    });
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const audioService = new AudioService();
