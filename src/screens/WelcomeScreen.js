import { View, Text, StatusBar, Image, TouchableOpacity, StyleSheet } from "react-native";
import React, { useCallback } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "nativewind";
import { ArrowUpRightIcon } from "react-native-heroicons/outline";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useNavigation } from "@react-navigation/native";

export default function WelcomeScreen() {
  const { colorScheme } = useColorScheme();
  const navigation = useNavigation();
  const [fontsLoaded, fontError] = useFonts({
    SpaceGroteskSemiBold: require("../font/SpaceGrotesk-SemiBold.ttf"),
    SpaceGroteskBold: require("../font/SpaceGrotesk-Bold.ttf"),
    SpaceGroteskMedium: require("../font/SpaceGrotesk-Medium.ttf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View
      onLayout={onLayoutRootView}
      style={styles.container}
    >
      <StatusBar style={colorScheme == "dark" ? "light" : "dark"} />

      <View style={styles.contentContainer}>
        {/* Heart Icon */}
        <View style={styles.imageContainer}>
          <Image
            source={require("../../assets/HeartIcon.png")}
            style={styles.heartIcon}
          />
        </View>

        {/* Welcome Text */}
        <View style={styles.textContainer}>
          {/* <Text style={styles.title}>Welcome!</Text> */}
          <Text style={styles.subtitle}>Experience Dating Your Way.</Text>
          <Text style={styles.description}>
          We leverage smart technology to help you find real and meaningful connections.
          </Text>
        </View>

        {/* Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.buttonText}>Let's get Started</Text>
            <ArrowUpRightIcon color={"#fff"} size={20} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: wp(100),
  },
  contentContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: wp(100),
    height: hp(100),
  },
  imageContainer: {
    paddingTop: 4,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 16,
    width: wp(100),
  },
  heartIcon: {
    width: wp(100),
    height: hp(40),
    resizeMode: "cover",
  },
  textContainer: {
    width: "100%",
    padding: 24,
    paddingHorizontal: 40,
  },
  title: {
    fontSize: wp(10),
    fontWeight: "600",
    letterSpacing: 2,
    lineHeight: wp(10),
  },
  subtitle: {
    fontSize: wp(10),
    fontWeight: "600",
    letterSpacing: 2,
    width: "70%",
    lineHeight: wp(10),
  },
  description: {
    fontSize: wp(3.5),
    color: "#1F2937",
    lineHeight: 24,
    letterSpacing: 1,
    width: "60%",
    marginTop: 8,
  },
  buttonContainer: {
    width: "100%",
    paddingHorizontal: 40,
  },
  button: {
    backgroundColor: "#FE3C72",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "45%",
  },
  buttonText: {
    fontSize: wp(3.5),
    color: "#fff",
    fontWeight: "800",
    marginRight: 8,
  },
});