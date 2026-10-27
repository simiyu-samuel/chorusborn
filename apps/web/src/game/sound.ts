import { useEffect, useRef, useState } from 'react';
import type { GameEvent, World } from '@chorusborn/contracts';
import { newSoundEvents } from './presentation.js';

// Original, synthesized cues. Audio starts only after this view receives a user gesture.
function tone(context: AudioContext, type: GameEvent['type']) {
  if (context.state !== 'running') return;
  const notes =
    type === 'capture'
      ? [392, 523.25, 659.25]
      : type === 'pickup'
        ? [523.25, 784]
        : type === 'shield'
          ? [330, 440]
          : type === 'defeat'
            ? [220, 146.83]
            : [440];
  const start = context.currentTime;
  notes.forEach((frequency, i) => {
    const oscillator = context.createOscillator(),
      gain = context.createGain(),
      at = start + i * 0.065;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.035, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.2);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  });
}
export function useArenaSound(world: World, active = true) {
  const context = useRef<AudioContext | null>(null),
    previous = useRef<World | null>(null);
  const [enabled, setEnabled] = useState(false),
    [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const events = newSoundEvents(previous.current, world);
    previous.current = world;
    if (active && enabled && context.current)
      for (const event of events.slice(-3)) tone(context.current, event.type);
  }, [world, enabled, active]);
  useEffect(
    () => () => {
      void context.current?.close();
    },
    [],
  );
  const toggle = async () => {
    if (enabled) {
      await context.current?.suspend();
      setEnabled(false);
      return;
    }
    try {
      if (!context.current || context.current.state === 'closed')
        context.current = new AudioContext();
      await context.current.resume();
      setEnabled(context.current.state === 'running');
    } catch {
      setUnavailable(true);
      setEnabled(false);
    }
  };
  return { enabled, unavailable, toggle };
}
