import { BuddyProvider } from '@/fun/BuddyContext';
import { FunProvider } from '@/fun/FunProvider';
import { FocusProvider } from '@/fun/FocusTimer';
import { KnightKick } from './KnightKick';
import { useFunMode } from './useFunMode';

/**
 * The playful layer: 3D buddies and page scenes, mascot, birds, games, sounds and confetti, with the settings people can adjust.
 * Everyone gets it except founders: for them FunProvider switches itself off and renders nothing.
 */
export function FunLayer({ children }) {
  const { on } = useFunMode();
  return (
    <BuddyProvider>
      <FunProvider enabled={on}>
        <FocusProvider>{children}</FocusProvider>
        {on && <KnightKick />}
      </FunProvider>
    </BuddyProvider>
  );
}

export default FunLayer;
