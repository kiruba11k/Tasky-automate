/**
 * LLM integration. Uses the Anthropic Messages API when ANTHROPIC_API_KEY is set; otherwise
 * falls back to a deterministic heuristic so the app keeps working offline.
 */
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

export async function invokeLLM({ prompt, response_json_schema }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return heuristic(prompt, response_json_schema);

  const system = response_json_schema
    ? `Respond with ONLY a JSON object (no prose, no code fences) matching this JSON schema:\n${JSON.stringify(response_json_schema)}`
    : undefined;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 4096, system, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`LLM request failed (${res.status}): ${await res.text()}`);
  const body = await res.json();
  const text = (body.content || []).map((c) => c.text || '').join('');
  if (!response_json_schema) return text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('LLM did not return JSON');
  return JSON.parse(match[0]);
}

/** Offline fallback: pulls task/member ids out of the allocation prompt and round-robins them. */
function heuristic(prompt, schema) {
  if (schema?.properties?.allocations) {
    const tasks = [...prompt.matchAll(/Task ID:\s*(\S+)/g)].map((m) => m[1]);
    const memberSet = [...prompt.matchAll(/Member ID:\s*(\S+)/g)].map((m) => m[1]);
    return {
      allocations: memberSet.length
        ? tasks.map((task_id, i) => ({
            task_id,
            member_id: memberSet[i % memberSet.length],
            confidence_score: 0.5,
            reasoning: 'Balanced round-robin assignment (no ANTHROPIC_API_KEY configured for skill-based AI matching).',
            estimated_completion_time_in_days: 3,
          }))
        : [],
    };
  }
  return schema ? {} : '';
}
