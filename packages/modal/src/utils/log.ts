export const log = (...x: Parameters<typeof console.log>) => console.log('[modal]', ...x);
