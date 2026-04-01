const MOBILE_EAS_PROJECT_ID = "30428968-87d8-456b-a15b-a272b07c4cfd";

const mobileExpoConfig = {
  name: "ProjectX Field",
  slug: "project-x",
  extra: {
    eas: {
      projectId: MOBILE_EAS_PROJECT_ID,
    },
  },
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/branding/pilot/icon.png",
  splash: {
    image: "./assets/branding/pilot/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0F766E",
  },
  plugins: [
    [
      "expo-image-picker",
      {
        microphonePermission: false,
      },
    ],
  ],
  platforms: ["android"],
  android: {
    package: "com.varunsah01.projectx",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/branding/pilot/adaptive-icon.png",
      backgroundColor: "#0F766E",
    },
  },
};

module.exports = {
  MOBILE_EAS_PROJECT_ID,
  mobileExpoConfig,
};
