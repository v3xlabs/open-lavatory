import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-solid";

type IconProps = {
  class?: string;
};

export const IconChevronLeft = (props: IconProps) => (
  <ChevronLeft class={props.class} aria-hidden="true" />
);

export const IconChevronRight = (props: IconProps) => (
  <ChevronRight class={props.class} aria-hidden="true" />
);

export const IconCircleHelp = (props: IconProps) => (
  <CircleHelp class={props.class} aria-hidden="true" />
);

export const IconX = (props: IconProps) => (
  <X class={props.class} aria-hidden="true" />
);

export const IconPlus = (props: IconProps) => (
  <Plus class={props.class} aria-hidden="true" />
);

export const IconTrash2 = (props: IconProps) => (
  <Trash2 class={props.class} aria-hidden="true" />
);

export const IconSettings = (props: IconProps) => (
  <Settings class={props.class} aria-hidden="true" />
);
