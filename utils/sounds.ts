export const playEmojiSound = (emoji: string) => {
  if (typeof window === 'undefined') return;
  
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
        env.gain.linearRampToTimeAtTime(0.1, now + 0.05);
        env.gain.linearRampToTimeAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
    case '🔥': // FIRE (Noise)
    case '👏': // CLAP
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = emoji === '🔥' ? 'lowpass' : 'highpass';
        noiseFilter.frequency.value = emoji === '🔥' ? 400 : 2000;
        noise.connect(noiseFilter);
        noiseFilter.connect(env);
        env.gain.linearRampToTimeAtTime(0.2, now + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        noise.start(now);
        noise.stop(now + 0.1);
        break;
    case '❤️': // HEARTBEAT
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, now);
        env.gain.linearRampToTimeAtTime(0.3, now + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
    case '🎉': // PARTY
    case '✨': // SPARKLE
        osc.type = 'sine';
        osc.frequency.setValueAtTime(emoji === '🎉' ? 440 : 1200, now);
        osc.frequency.exponentialRampToValueAtTime(emoji === '🎉' ? 880 : 1600, now + 0.2);
        env.gain.linearRampToTimeAtTime(0.1, now + 0.05);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
    case '🚀': // ROCKET
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
        env.gain.linearRampToTimeAtTime(0.1, now + 0.1);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
    default: // CHIME
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        env.gain.linearRampToTimeAtTime(0.1, now + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
  }
};
