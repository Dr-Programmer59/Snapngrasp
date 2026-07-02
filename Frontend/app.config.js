import 'dotenv/config';

export default {
  expo: {
    name: "SnapnGraspp",
    slug: "snapngraspp",
    version: "1.0.0",
    owner: "clouds-dev-group",
    scheme: "snapngrasp",
    icon: "./assets/images/icon.png",
    android: {
      package: "com.snapngrasp.app",
      package: "com.snapngrasp.app"
    },
    ios: {
      bundleIdentifier: "com.snapngrasp.app",
      buildNumber: "49",
      infoPlist: {
        NSMicrophoneUsageDescription: "We use the microphone so you can join live voice chats and speak with the AI tutor.",
        NSCameraUsageDescription: "We use your camera so you can take photos to upload within the app, such as profile pictures or content images.",
        NSPhotoLibraryUsageDescription: "We access your photo library so you can choose existing photos to upload within the app, such as profile pictures or content images.",
        NSPhotoLibraryAddUsageDescription: "We save photos to your library only when you choose to download or save images from the app."
      }
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      eas: {
        projectId: "811b8b83-3edb-4902-83cf-d8747e748709"
      }
    },
  },
};
