import { useState, useRef, useCallback } from 'react';

export const useRecorder = (stream: MediaStream | null) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = useCallback(() => {
    if (!stream) {
      console.warn("No stream available for recording.");
      return;
    }

    chunks.current = [];
    mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorder.current.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };

    mediaRecorder.current.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `syncmeet-session-${new Date().getTime()}.webm`;
      a.click();
      setIsRecording(false);
    };

    mediaRecorder.current.start();
    setIsRecording(true);
  }, [stream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
  }, []);

  return { isRecording, startRecording, stopRecording };
};
