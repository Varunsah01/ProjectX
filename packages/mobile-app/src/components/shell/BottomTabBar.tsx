import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors, spacing } from "../../constants/theme";
import type { MainTabRouteName } from "../../navigation/types";

const tabs: Array<{ label: string; route: MainTabRouteName }> = [
  { label: "Home", route: "Home" },
  { label: "Jobs", route: "Jobs" },
  { label: "Complaints", route: "Complaints" },
  { label: "Profile", route: "Profile" },
];

export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const activeRouteName = state.routes[state.index]?.name as
    | MainTabRouteName
    | undefined;

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = activeRouteName === tab.route;

        return (
          <Pressable
            key={tab.route}
            onPress={() => {
              const targetRoute = state.routes.find(
                (route) => route.name === tab.route,
              );
              const event = navigation.emit({
                type: "tabPress",
                target: targetRoute?.key,
                canPreventDefault: true,
              });

              if (!isActive && !event.defaultPrevented) {
                navigation.navigate(tab.route);
              }
            }}
            testID={`app-tab.${tab.route.toLowerCase()}`}
            style={({ pressed }) => [
              styles.tabButton,
              isActive && styles.tabButtonActive,
              pressed && styles.tabButtonPressed,
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
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
