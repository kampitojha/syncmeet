import { useState, useEffect, useCallback, useRef } from 'react';

export const useCaptions = (isEnabled: boolean, onCaption: (text: string) => void) => {
  const recognitionRef = useRef<any>(null);
  const isEnabledRef = useRef(isEnabled);

  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

  const initRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Better support for local accents/Hinglish

    let lastResultTime = Date.now();

    recognition.onresult = (event: any) => {
      let displayTranscript = '';
      
      // Use a sliding window of the last 2 results for better context/persistence
      const startIndex = Math.max(0, event.results.length - 2);
      for (let i = startIndex; i < event.results.length; ++i) {
        displayTranscript += event.results[i][0].transcript;
      }

      if (displayTranscript.trim()) {
        onCaption(displayTranscript.trim());
        lastResultTime = Date.now();
      }
    };

    recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
            console.error("Speech Recognition PERMISSION_DENIED");
            isEnabledRef.current = false;
        }
        // Restart on common non-fatal errors
        if (['network', 'no-speech', 'audio-capture'].includes(event.error)) {
            setTimeout(() => { if (isEnabledRef.current) recognition.start(); }, 1000);
        }
    };

    recognition.onend = () => {
        // Aggressive restart if still enabled
        if (isEnabledRef.current) {
            const timeSinceLastResult = Date.now() - lastResultTime;
            // Short delay to prevent browser throttling
            setTimeout(() => {
                try { 
                    if (isEnabledRef.current) recognition.start(); 
                } catch (e) {}
            }, timeSinceLastResult > 5000 ? 100 : 500); 
        }
    };

    recognitionRef.current = recognition;
  }, [onCaption]);

  useEffect(() => {
    if (!recognitionRef.current) initRecognition();

    if (isEnabled && recognitionRef.current) {
        try { 
            recognitionRef.current.start(); 
        } catch (e) {
            // Already started?
        }
    } else if (recognitionRef.current) {
        try { 
            recognitionRef.current.stop(); 
        } catch (e) {}
    }

    return () => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) {}
        }
    };
  }, [isEnabled, initRecognition]);

  return {};
};
