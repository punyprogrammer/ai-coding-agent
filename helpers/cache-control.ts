import type { ModelMessage } from "ai";

const MAX_CACHE_BREAKPOINTS = 4;

function breakpointIndexes(length: number): number[] {
  const candidates: number[] = [];
  for (let i = 0; i < length; i++) {
    if (i === 0 || i < length - 2) {
      candidates.push(i);
    }
  }
  if (candidates.length <= MAX_CACHE_BREAKPOINTS) {
    return candidates;
  }
  const first = candidates[0];
  const latest = candidates.slice(-(MAX_CACHE_BREAKPOINTS - 1));
  return [first, ...latest.filter((index) => index !== first)];
}

export function addCacheControl(messages: ModelMessage[]): ModelMessage[] {
  const breakpoints = new Set(breakpointIndexes(messages.length));

  return messages.map((message, index) => {
    if (!breakpoints.has(index)) {
      return message;
    }

    return {
      ...message,
      providerOptions: {
        ...message.providerOptions,
        anthropic: {
          ...message.providerOptions?.anthropic,
          cacheControl: { type: "ephemeral" },
        },
      },
    };
  });
}
