import React, { useState } from "react";
import { View, StyleSheet, Alert, ImageBackground } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../config";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const API_URL = `${BASE_URL}/api/auth`;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password!");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      console.log("Full response data:", data);

      if (response.ok) {
        await AsyncStorage.setItem("token", data.token);
        console.log("Login response:", data);
        console.log("needsProfileSetup:", data.needsProfileSetup);

        if (data.needsProfileSetup === true) {
          console.log("Navigating to NewUser");
          navigation.navigate("NewUser");
        } else if (data.needsProfileSetup === false) {
          console.log("Navigating to HomeTabs");
          navigation.navigate("HomeTabs");
        } else {
          console.warn("needsProfileSetup is undefined, defaulting to NewUser");
          navigation.navigate("NewUser");
        }
      } else {
        Alert.alert("Error", data.message || "Login failed!");
      }
    } catch (error) {
      Alert.alert("Error", "Unable to connect to the server!");
      console.error("Login error:", error.message);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/HeartIcon.png")}
      style={styles.background}
    >
      <View style={styles.container}>
        <Text style={styles.logoText}>DATING APP</Text>
        <View style={styles.formContainer}>
          <TextInput
            label="Email or Phone Number"
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={styles.input}
            theme={{ colors: { primary: "#FE3C72", background: "#fff" } }}
            placeholder="Enter your email or phone number"
          />
          <TextInput
            label="Password"
            mode="outlined"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            theme={{ colors: { primary: "#FE3C72", background: "#fff" } }}
            placeholder="Enter your password"
          />
          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.loginButton}
            labelStyle={styles.buttonText}
          >
            Login
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate("Register")}
            style={styles.registerButton}
            labelStyle={styles.registerText}
          >
            Don't have an account? Register
          </Button>
        </View>
      </View>
    </ImageBackground>
  );
}
const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.2)", 
  },
  logoText: {
    fontSize: 60,
    fontWeight: "bold",
    color: "#FE3C72",
    marginBottom: 40,
    textAlign: "center",
 //   fontFamily: "Arial",
  },
  formContainer: {
    width: "100%",
    maxWidth: 350,
    backgroundColor: "rgba(255, 255, 255, 0.9)", 
    padding: 20,
    borderRadius: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  input: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 25,
    height: 50,
  },
  loginButton: {
    backgroundColor: "#FE3C72",
    paddingVertical: 8,
    borderRadius: 25,
    marginTop: 10,
    elevation: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  registerButton: {
    marginTop: 20,
  },
  registerText: {
    color: "#FE3C72",
    fontSize: 16,
    fontWeight: "500",
  },
});