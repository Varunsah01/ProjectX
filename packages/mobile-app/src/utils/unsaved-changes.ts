import { Alert } from "react-native";

export const UNSAVED_CHANGES_BACK_GUARD_REASON =
  "Finish saving your changes before leaving this screen.";

export const UNSAVED_CHANGES_DISCARD_TITLE = "Discard Unsaved Changes?";
export const UNSAVED_CHANGES_DISCARD_MESSAGE =
  "Leave this screen and lose the current changes?";

export function confirmDiscardUnsavedChanges({
  onDiscard,
  confirmLabel = "Discard",
  message = UNSAVED_CHANGES_DISCARD_MESSAGE,
}: {
  onDiscard: () => void;
  confirmLabel?: string;
  message?: string;
}) {
  Alert.alert(UNSAVED_CHANGES_DISCARD_TITLE, message, [
    {
      text: "Stay",
      style: "cancel",
    },
    {
      text: confirmLabel,
      style: "destructive",
      onPress: onDiscard,
    },
  ]);
}
