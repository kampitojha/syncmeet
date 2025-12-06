import { useState, useEffect, useRef } from 'react';

export const useAudioLevel = (stream: MediaStream | null, isEnabled: boolean = true) => {
  const [volume, setVolume] = useState(0);
  const frameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    // If stream is missing, audio is disabled, or no audio tracks, reset volume
    if (!stream || !isEnabled || stream.getAudioTracks().length === 0) {
      setVolume(0);
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5; // Responsive but smooth
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        // Normalize 0-255 range to roughly 0-100.
        // Speech often hovers around 20-50 in avg byte data depending on mic.
        // We amplify it a bit for visual clarity.
        const normalized = Math.min(100, (avg / 128) * 100);
        
        setVolume(normalized);
        frameRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch (err) {
      console.error("AudioContext setup failed:", err);
    }

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stream, isEnabled]);

  return volume;
};