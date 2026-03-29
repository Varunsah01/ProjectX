import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../constants/theme";
import type { MainTabRouteName } from "../../app/navigation";

const tabs: Array<{ label: string; route: MainTabRouteName }> = [
  { label: "Home", route: "home" },
  { label: "Jobs", route: "jobs" },
  { label: "Complaints", route: "complaints" },
  { label: "Profile", route: "profile" },
];

export default function BottomTabBar({
  activeTab,
  onSelectTab,
}: {
  activeTab: MainTabRouteName;
  onSelectTab: (tab: MainTabRouteName) => void;
}) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.route}
          onPress={() => onSelectTab(tab.route)}
          style={({ pressed }) => [
            styles.tabButton,
            activeTab === tab.route && styles.tabButtonActive,
            pressed && styles.tabButtonPressed,
          ]}
        >
          <Text style={[styles.tabLabel, activeTab === tab.route && styles.tabLabelActive]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  tabButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  tabButtonActive: {
    backgroundColor: colors.brandSoft,
  },
  tabButtonPressed: {
    opacity: 0.9,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.brand,
  },
});
