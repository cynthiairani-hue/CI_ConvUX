"use client";

import { useState, useRef, useCallback } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionAny = any;

function getSpeechAPI(): SpeechRecognitionAny | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) as
    | SpeechRecognitionAny
    | undefined;
}

export function useVoiceInput(
  value: string,
  setValue: (v: string) => void
) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionAny | null>(null);
  const voiceBaseRef = useRef("");

  const hasSpeechAPI = !!getSpeechAPI();

  const toggleVoice = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechAPI();
    if (!SpeechRecognitionCtor) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionAny) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      const base = voiceBaseRef.current;
      const combined = finalText + interimText;
      setValue(base ? `${base} ${combined}` : combined);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    voiceBaseRef.current = value.trim();
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, value, setValue]);

  return { isListening, hasSpeechAPI, toggleVoice };
}
