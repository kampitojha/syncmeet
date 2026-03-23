import { useState, useEffect, useCallback, useRef } from 'react';

export const useCaptions = (isEnabled: boolean, onCaption: (text: string) => void) => {
  const recognition = useRef<any>(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.lang = 'en-US';

    recognition.current.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onCaption(finalTranscript);
      }
    };

    recognition.current.onerror = (event: any) => {
        if (event.error !== 'no-speech') console.error("Speech Recognition Error:", event.error);
    };

    return () => {
      if (recognition.current) recognition.current.stop();
    };
  }, []);

  useEffect(() => {
    if (isEnabled && recognition.current) {
        try { recognition.current.start(); } catch (e) {}
    } else if (recognition.current) {
        recognition.current.stop();
    }
  }, [isEnabled]);

  return {};
};
