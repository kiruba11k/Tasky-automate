// The rules of the mood quest (kept apart from the screen so they can be tested).
export const MOODS = [
  ['great', '😄', 'Great'],
  ['happy', '🙂', 'Happy'],
  ['okay', '😐', 'Okay'],
  ['tired', '😴', 'Tired'],
  ['stressed', '🤯', 'Stressed'],
  ['low', '😢', 'Low'],
];

// id, sticker, text. One sticker per challenge; do them all to fill the page.
export const CHALLENGES = {
  great: [
    ['highfive', '🙌', 'Send a high-five to a teammate (Team hub → Shout-outs).'],
    ['win', '🏆', 'Share one win from this week with someone.'],
    ['shortcut', '💡', 'Teach a teammate one handy trick you know.'],
    ['dance', '🎶', 'Dance for ten seconds. No audience needed.'],
  ],
  happy: [
    ['compliment', '💛', 'Give a teammate one sincere compliment.'],
    ['joke', '😂', 'Tell someone your best joke.'],
    ['thanks', '🙏', 'Thank someone for something small they did.'],
    ['smile', '🌞', 'Smile at the next three people you meet.'],
  ],
  okay: [
    ['stretch', '🧘', 'Stand up and stretch for thirty seconds.'],
    ['tidy', '🧹', 'Tidy one thing on your desk.'],
    ['water', '💧', 'Go and refill your water, then drink a glass.'],
    ['walk', '🦶', 'Walk once around the floor before your next task.'],
  ],
  tired: [
    ['window', '🌳', 'Look out of a window for twenty seconds.'],
    ['breaths', '🌬', 'Take five slow breaths: in for four, out for six.'],
    ['snack', '🍎', 'Eat something small and good for you.'],
    ['sun', '☀️', 'Step into daylight for two minutes.'],
  ],
  stressed: [
    ['onething', '🎯', 'Write down the ONE thing that matters most today.'],
    ['shoulders', '🧘', 'Drop your shoulders, unclench your jaw, repeat three times.'],
    ['pause', '⏳', 'Pause for sixty seconds before replying to your next message.'],
    ['ask', '🤝', 'Ask someone for a hand with one thing.'],
  ],
  low: [
    ['hi', '💬', 'Send a friend a plain "hi, thinking of you".'],
    ['outside', '🌿', 'Go outside for two minutes.'],
    ['smalltask', '✅', 'Finish one tiny two-minute task and tick it off.'],
    ['kind', '💛', 'Do one small kind thing for someone, quietly.'],
  ],
};
export const ALL = Object.values(CHALLENGES).flat();
export const MAX_REROLLS = 3;


export const addDays = (date, n) => { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Days in a row (ending today, or yesterday if today is not done yet) with a finished challenge. */
export function streakOf(days, date) {
  let d = days[date]?.done ? date : addDays(date, -1);
  let n = 0;
  while (days[d]?.done) { n += 1; d = addDays(d, -1); }
  return n;
}

/** Picks a challenge for a mood, never the one already shown. */
export function pickChallenge(mood, not, random = Math.random) {
  const list = (CHALLENGES[mood] || []).filter((c) => c[0] !== not);
  return list[Math.floor(random() * list.length)] || CHALLENGES[mood][0];
}

