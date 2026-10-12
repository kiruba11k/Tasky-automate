import { BuddyProvider } from '@/fun/BuddyContext';
import { FunProvider } from '@/fun/FunProvider';
import { FocusProvider } from '@/fun/FocusTimer';
import { KnightKick } from './KnightKick';

/**
 * The playful layer: 3D buddies and page scenes, mascot, birds, games, sounds and confetti, with the settings people can adjust.
 * Everyone gets it except founders: for them FunProvider switches itself off and renders nothing.
 */
export function FunLayer({ children }) {
  return (
    <BuddyProvider>
      <FunProvider>
        <FocusProvider>{children}</FocusProvider>
        <KnightKick />
      </FunProvider>
    </BuddyProvider>
  );
}

export default FunLayer;
