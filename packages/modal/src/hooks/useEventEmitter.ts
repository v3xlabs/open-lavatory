import type EventEmitter from "eventemitter3";
import { useEffect } from "preact/hooks";

export const useEventEmitter = <
  R extends EventEmitter.ValidEventTypes = string | symbol,
  E extends EventEmitter.EventNames<R> = EventEmitter.EventNames<R>,
  Fn extends EventEmitter.EventListener<R, E> = EventEmitter.EventListener<
    R,
    E
  >,
>(
  emitter: EventEmitter<R> | undefined,
  event: E,
  fn: Fn,
) => {
  useEffect(() => {
    emitter?.on(event, fn);

    return () => {
      emitter?.off(event, fn);
    };
  }, [emitter, event]);
};
