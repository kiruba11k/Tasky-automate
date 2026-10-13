import { useAuth } from '@/auth/AuthContext';
import { useStore } from '../store';

/**
 * The "Fun mode" switch (Theme dialog): 3D scenes and buddies, the Team hub and games, birds, sounds and effects.
 * Founders never have it (no switch, nothing loads). Everyone else starts with it off and turns it on for themselves;
 * the choice is saved on their profile, so it follows them to every device.
 */
export function useFunMode() {
  const { user } = useAuth();
  const me = useStore((s) => s.me);
  const funOn = useStore((s) => s.profiles[s.me]?.funOn === true);
  const setProfile = useStore((s) => s.setProfile);
  const available = Boolean(user) && !user.founder;
  return { available, on: available && funOn, set: (value) => setProfile(me, { funOn: Boolean(value) }) };
}

export default useFunMode;
