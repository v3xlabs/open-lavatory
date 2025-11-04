import type { FC, PropsWithChildren } from "preact/compat";
import { LuCircleHelp } from "react-icons/lu";
import { match } from "ts-pattern";

export type InfoTooltipVariant = "icon" | "text";
export type InfoTooltipProps = {
  variant: InfoTooltipVariant;
};

export const InfoTooltip: FC<PropsWithChildren<InfoTooltipProps>> = ({
  variant,
  children,
}) => {
  return (
    <div>
      <div>
        {match(variant)
          .with("icon", () => <LuCircleHelp />)
          .with("text", () => <div>Text</div>)
          .exhaustive()}
      </div>
      <div className="hidden">{children}</div>
    </div>
  );
};
