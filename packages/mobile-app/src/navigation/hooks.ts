import { useNavigation, type NavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList, TabParamList } from "./types";

export function useAppNavigation<
  T extends keyof RootStackParamList = keyof RootStackParamList,
>(): NavigationProp<RootStackParamList, T> {
  return useNavigation<NavigationProp<RootStackParamList, T>>();
}

export function useRootNavigation<
  T extends keyof RootStackParamList = keyof RootStackParamList,
>(): NativeStackNavigationProp<RootStackParamList, T> {
  return useNavigation<NativeStackNavigationProp<RootStackParamList, T>>();
}

export function useTabNavigation<
  T extends keyof TabParamList = keyof TabParamList,
>(): BottomTabNavigationProp<TabParamList, T> {
  return useNavigation<BottomTabNavigationProp<TabParamList, T>>();
}
