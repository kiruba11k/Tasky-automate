import ProgressChip from '@/fun/ProgressChip';
import MotionToggle from '@/fun/MotionToggle';
import { LunchButton } from '@/fun/LunchBreak';
import { BirdButton } from '@/fun/BirdPost';
import { FunScope } from '@/fun/FunProvider';

/**
 * The fun layer's controls in the top bar: the level chip (level, streak, trophies and every fun setting: 3D, sounds, effects,
 * birds, ...), the calm / full motion switch, the lunch break and the anonymous bird post.
 */
export function FunChip() {
  return (
    <FunScope className="flex items-center gap-1.5">
      <BirdButton />
      <LunchButton />
      <MotionToggle />
      <ProgressChip />
    </FunScope>
  );
}

export default FunChip;
