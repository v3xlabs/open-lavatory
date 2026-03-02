import classNames from "classnames";
import { Show, type JSX } from "solid-js";

export type TransitionContainerProps<T> = {
  current: T;
  previous: T | undefined;
  isTransitioning: boolean;
  render: (value: T) => JSX.Element;
  class?: string;
};

export const TransitionContainer = <T = unknown,>(
  props: TransitionContainerProps<T>,
) => (
  <div class={classNames("modal-transition__container", props.class)}>
    <Show when={props.previous !== undefined}>
      <div class="modal-transition__layer modal-transition__layer--outgoing">
        {props.render(props.previous as T)}
      </div>
    </Show>
    <div
      class={classNames(
        "modal-transition__layer",
        props.isTransitioning && "modal-transition__layer--incoming",
      )}
    >
      {props.render(props.current)}
    </div>
  </div>
);
