import { useCallback, useEffect, useRef, useState } from 'react';

const Recognition = typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition;

/**
 * Browser speech-to-text (Web Speech API: Chrome, Edge, Safari). Keeps listening through pauses until stop() is called.
 * `onFinal(text)` receives each finished phrase; `interim` is the phrase still being recognised.
 */
export function useSpeech({ lang = 'en-IN', onFinal }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const wantRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
    setInterim('');
  }, []);

  const start = useCallback(() => {
    if (!Recognition) return;
    setError('');
    const rec = new Recognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) onFinalRef.current?.(r[0].transcript.trim());
        else live += r[0].transcript;
      }
      setInterim(live);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantRef.current = false;
        setError('Microphone access was blocked. Allow it in the browser address bar, then try again.');
      } else if (e.error === 'network') {
        wantRef.current = false;
        setError('Speech recognition needs an internet connection.');
      } else if (e.error === 'audio-capture') {
        wantRef.current = false;
        setError('No microphone was found.');
      }
    };
    rec.onend = () => {
      // Browsers end the session after a stretch of silence; carry on until the user presses stop.
      if (wantRef.current) {
        try { rec.start(); return; } catch { /* fall through */ }
      }
      setListening(false);
      setInterim('');
    };
    recRef.current = rec;
    wantRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError('Could not start the microphone.');
    }
  }, [lang]);

  useEffect(() => () => { wantRef.current = false; recRef.current?.abort?.(); }, []);

  return { supported: !!Recognition, listening, interim, error, start, stop };
}
