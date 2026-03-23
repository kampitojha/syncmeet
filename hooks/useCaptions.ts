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
    recognition.lang = 'en-US'; // Default, but robust

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const fullText = (finalTranscript || interimTranscript).trim();
      if (fullText) {
        onCaption(fullText);
      }
    };

    recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.error("Speech Recognition Error:", event.error);
        }
    };

    recognition.onend = () => {
        if (isEnabledRef.current) {
            try { 
                recognition.start(); 
            } catch (e) {
                // Ignore concurrent start errors
            }
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
