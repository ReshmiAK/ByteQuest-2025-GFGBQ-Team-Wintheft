export class TTSService {
  private synth: SpeechSynthesis;
  private enabled: boolean = false;
  private isSpeaking: boolean = false;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.cancel();
    }
  }

  public cancel() {
    this.synth.cancel();
    this.isSpeaking = false;
  }
  public speakDual(englishText: string, hindiText: string) {
    if (!this.enabled) return;
    this.cancel();

    const u1 = new SpeechSynthesisUtterance(englishText);
    u1.lang = 'en-US';
    u1.rate = 0.9;

    const u2 = new SpeechSynthesisUtterance(hindiText);
    u2.lang = 'hi-IN';
    u2.rate = 0.85;

    u1.onend = () => {
      if (this.enabled) this.synth.speak(u2);
    };

    this.synth.speak(u1);
  }

  public speak(text: string, lang: 'en' | 'hi' = 'en') {
    if (!this.enabled) return;
    this.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'en' ? 'en-US' : 'hi-IN';
    u.rate = 0.9;
    this.synth.speak(u);
  }

  public announce(text: string) {
    if (this.enabled) {
      this.speak(text);
    }
  }
}

export const tts = new TTSService();