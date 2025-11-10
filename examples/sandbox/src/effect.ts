import type EventEmitter from 'eventemitter3';
import { useEffect } from 'react';

export const useEventEmitter = <
    X extends EventEmitter<R> | undefined,
    R extends EventEmitter.ValidEventTypes = string | symbol,
    E extends EventEmitter.EventNames<R> = EventEmitter.EventNames<R>,
    Fn extends EventEmitter.EventListener<R, E> = EventEmitter.EventListener<R, E>,
>(
    emitter: X | undefined,
    event: E,
    fn: Fn
) => {
    useEffect(() => {
        console.log('useEventEmitter', emitter, event, fn);
        emitter?.on(event, fn);

        return () => {
            emitter?.off(event, fn);
        };
    }, [emitter, event, fn]);
};
