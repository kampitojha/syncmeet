let sharedCtx: AudioContext | null = null;

const getCtx = () => {
  if (!sharedCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    sharedCtx = new AudioContextClass();
  }
  return sharedCtx;
};

export const playEmojiSound = async (emoji: string) => {
  if (typeof window === 'undefined') return;
  
  const ctx = getCtx();
  if (ctx.state === 'suspended') await ctx.resume();

  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  
  osc.connect(env);
  env.connect(ctx.destination);
  
  const now = ctx.currentTime;
  env.gain.setValueAtTime(0, now);

  switch(emoji) {
    case '⚡': // ZAP
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
        env.gain.linearRampToValueAtTime(0.2, now + 0.05);
        env.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
    case '👏': // CLAP
    case '🔥': // FIRE
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = emoji === '🔥' ? 'lowpass' : 'highpass';
        noiseFilter.frequency.value = emoji === '🔥' ? 400 : 2500;
        noise.connect(noiseFilter);
        noiseFilter.connect(env);
        env.gain.linearRampToValueAtTime(0.3, now + 0.005);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        noise.start(now);
        noise.stop(now + 0.12);
        break;
    case '❤️': // HEARTBEAT
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, now);
        env.gain.linearRampToValueAtTime(0.4, now + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
    case '🎉': // PARTY
    case '✨': // SPARKLE
        osc.type = 'sine';
        osc.frequency.setValueAtTime(emoji === '🎉' ? 523.25 : 1500, now); // C5 or very high
        osc.frequency.exponentialRampToValueAtTime(emoji === '🎉' ? 1046.5 : 2000, now + 0.25);
        env.gain.linearRampToValueAtTime(0.15, now + 0.05);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
    case '🚀': // ROCKET
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
        env.gain.linearRampToValueAtTime(0.15, now + 0.15);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
    default: // CHIME
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        env.gain.linearRampToValueAtTime(0.1, now + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
  }
};
