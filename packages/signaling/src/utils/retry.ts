export type RetryConfig = {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  jitter?: boolean;
};

export type RetryStep = {
  attempt: number;
  delay: number;
};

export const createRetrier = (config: RetryConfig) => {
  let attempt = 0;

  const reset = () => {
    attempt = 0;
  };

  const nextDelay = (): RetryStep | undefined => {
    if (attempt >= config.maxRetries) return;

    attempt += 1;

    const baseDelay = Math.min(
      config.initialDelayMs * 2 ** (attempt - 1),
      config.maxDelayMs,
    );
    const delay
      = config.jitter === false
        ? baseDelay
        : baseDelay * (0.5 + Math.random() * 0.5);

    return { attempt, delay };
  };

  return {
    reset,
    nextDelay,
  };
};
