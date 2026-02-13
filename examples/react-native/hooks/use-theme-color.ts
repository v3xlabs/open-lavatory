/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const useThemeColor = (
  props: { light?: string; dark?: string; },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark,
) => {
  const theme = useColorScheme() ?? "light";
  const colorFromProps = props[theme];

  return colorFromProps || Colors[theme][colorName];
};
