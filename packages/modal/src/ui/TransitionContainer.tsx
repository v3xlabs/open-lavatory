import classNames from "classnames";
import type { ComponentChildren } from "preact";

export type TransitionContainerProps<T> = {
  current: T;
  previous: T | null;
  isTransitioning: boolean;
  render: (value: T) => ComponentChildren;
  className?: string;
};

export const TransitionContainer = <T,>({
  current,
  previous,
  isTransitioning,
  render,
  className,
}: TransitionContainerProps<T>) => {
  return (
    <div className={classNames("modal-transition__container", className)}>
      {previous !== null && (
        <div className="modal-transition__layer modal-transition__layer--outgoing">
          {render(previous)}
        </div>
      )}
      <div
        className={classNames(
          "modal-transition__layer",
          isTransitioning && "modal-transition__layer--incoming",
        )}
      >
        {render(current)}
      </div>
    </div>
  );
};
