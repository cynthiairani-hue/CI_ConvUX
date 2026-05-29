"use client";

import { useState, useRef, useCallback, useEffect } from "react";

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
  // Track whether the user explicitly stopped — prevents auto-restart
  const stoppedByUserRef = useRef(false);
  // Track accumulated final text across continuous recognition restarts
  const accumulatedTextRef = useRef("");

  // Defer to useEffect so SSR and first client render match (avoids hydration mismatch)
  const [hasSpeechAPI, setHasSpeechAPI] = useState(false);
  useEffect(() => { setHasSpeechAPI(!!getSpeechAPI()); }, []);

  const startRecognition = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechAPI();
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
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
      const accumulated = accumulatedTextRef.current;
      const newFinal = accumulated + finalText;
      const display = newFinal + interimText;
      setValue(base ? `${base} ${display}` : display);

      // When we get final results, store them so restarts don't lose text
      if (finalText) {
        accumulatedTextRef.current = newFinal;
      }
    };

    recognition.onend = () => {
      // If the user didn't explicitly stop, restart to keep listening
      // Browser speech recognition can time out after silence — we restart it
      if (!stoppedByUserRef.current) {
        // Update base to include everything accumulated so far
        const base = voiceBaseRef.current;
        const accumulated = accumulatedTextRef.current;
        if (accumulated) {
          voiceBaseRef.current = base ? `${base} ${accumulated}`.trim() : accumulated.trim();
          accumulatedTextRef.current = "";
        }
        // Restart after a tiny delay to avoid rapid restart loops
        setTimeout(() => {
          if (!stoppedByUserRef.current) {
            try {
              const fresh = new SpeechRecognitionCtor();
              fresh.continuous = true;
              fresh.interimResults = true;
              fresh.lang = "en-US";
              fresh.onresult = recognition.onresult;
              fresh.onend = recognition.onend;
              fresh.onerror = recognition.onerror;
              recognitionRef.current = fresh;
              fresh.start();
            } catch {
              // If restart fails, stop gracefully
              setIsListening(false);
              recognitionRef.current = null;
            }
          }
        }, 100);
      } else {
        setIsListening(false);
        recognitionRef.current = null;
      }
    };

    recognition.onerror = (event: SpeechRecognitionAny) => {
      // "no-speech" and "aborted" are normal — just let onend handle restart
      if (event.error === "no-speech" || event.error === "aborted") return;
      // Real errors — stop listening
      stoppedByUserRef.current = true;
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [setValue]);

  const toggleVoice = useCallback(() => {
    if (!getSpeechAPI()) return;

    if (isListening && recognitionRef.current) {
      // User explicitly stopping
      stoppedByUserRef.current = true;
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    // Starting fresh
    stoppedByUserRef.current = false;
    accumulatedTextRef.current = "";
    voiceBaseRef.current = value.trim();
    setIsListening(true);
    startRecognition();
  }, [isListening, value, startRecognition]);

  return { isListening, hasSpeechAPI, toggleVoice };
}
