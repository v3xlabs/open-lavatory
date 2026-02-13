import { Pressable, StyleSheet, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  style?: ViewStyle;
};

export const Button = ({
  title,
  onPress,
  disabled,
  variant = "primary",
  backgroundColor,
  borderColor,
  textColor,
  style,
}: ButtonProps) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.button,
      variant === "secondary" ? styles.buttonSecondary : null,
      backgroundColor ? { backgroundColor } : undefined,
      borderColor ? { borderColor } : undefined,
      disabled ? styles.buttonDisabled : null,
      pressed && !disabled ? styles.buttonPressed : null,
      style,
    ]}
  >
    <ThemedText
      style={[
        styles.buttonText,
        textColor ? { color: textColor } : undefined,
      ]}
    >
      {title}
    </ThemedText>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: "600",
  },
});
