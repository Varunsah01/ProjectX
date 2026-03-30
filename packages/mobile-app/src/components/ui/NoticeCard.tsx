import Card from "./Card";
import Button from "./Button";
import { colors } from "../../constants/theme";
import { StyleSheet, Text, View } from "react-native";

type NoticeTone = "info" | "warning" | "danger" | "success";

const toneStyles = {
  info: {
    borderColor: colors.infoSoft,
    backgroundColor: "#f8fbff",
    titleColor: colors.info,
    messageColor: colors.textMuted,
  },
  warning: {
    borderColor: colors.warningSoft,
    backgroundColor: "#fffaf0",
    titleColor: colors.warning,
    messageColor: colors.textMuted,
  },
  danger: {
    borderColor: colors.dangerSoft,
    backgroundColor: "#fff7f7",
    titleColor: colors.danger,
    messageColor: colors.textMuted,
  },
  success: {
    borderColor: colors.successSoft,
    backgroundColor: "#f7fff9",
    titleColor: colors.success,
    messageColor: colors.textMuted,
  },
} as const;

export default function NoticeCard({
  tone = "info",
  title,
  message,
  actionLabel,
  onAction,
}: {
  tone?: NoticeTone;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const palette = toneStyles[tone];

  return (
    <Card
      style={[
        styles.card,
        {
          borderColor: palette.borderColor,
          backgroundColor: palette.backgroundColor,
        },
      ]}
    >
      <View style={styles.copy}>
        {title ? (
          <Text
            style={[
              styles.title,
              {
                color: palette.titleColor,
              },
            ]}
          >
            {title}
          </Text>
        ) : null}
        <Text
          style={[
            styles.message,
            {
              color: palette.messageColor,
            },
          ]}
        >
          {message}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="secondary" onPress={onAction} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  copy: {
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
  },
});
