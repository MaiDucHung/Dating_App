import React from "react";
import WelcomeScreen from "../screens/WelcomeScreen";
import HomeScreen from "../screens/HomeScreen";
import ChatScreen from "../screens/ChatScreen";
import ProfileScreen from "../screens/ProfileScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import NewUserScreen from "../screens/NewUserScreen";
import RegisterScreen from "../screens/RegisterScreen";
import LoginScreen from "../screens/LoginScreen";
import LikeYouScreen from "../screens/LikeYouScreen";
import ViewAgainScreen from "../screens/ViewAgainScreen";
import ChatDetailsScreen from "../screens/ChatDetailsScreen";
import MatchScreen from "../screens/MatchScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import AdminPanelScreen from "../screens/AdminPanelScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export default function AppNavigation() {
  const { colorScheme } = useColorScheme();

  const HomeTabs = () => {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => {
            let iconName;

            if (route.name === "Home") {
              iconName = "home";
            } else if (route.name === "Chat") {
              iconName = "chatbubbles-outline";
            } else if (route.name === "Matches") {
              iconName = "heart-outline";
            } else if (route.name === "Profile") {
              iconName = "person-outline";
            }

            const customizeSize = 25;

            return (
              <Ionicons
                name={iconName}
                size={customizeSize}
                color={focused ? "#FE3C72" : "gray"}
              />
            );
          },
          tabBarActiveTintColor: "#FE3C72",
          tabBarLabelStyle: {
            fontWeight: "bold",
          },
          tabBarInactiveTintColor: "gray",
          tabBarStyle: {
            backgroundColor: colorScheme == "dark" ? "black" : "white",
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
        
      </Tab.Navigator>
    );
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome" 
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ChatDetails"
          component={ChatDetailsScreen}
          options={{
            presentation: "modal",
          }}
        />
         {/* <Stack.Screen name="Match" component={InMatchScreen} /> */}
        <Stack.Screen name="HomeTabs" component={HomeTabs} />
        <Stack.Screen name="NewUser" component={NewUserScreen} />
        <Stack.Screen name="Match" component={MatchScreen} />
         <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="Login"  component={LoginScreen} />
        <Stack.Screen name="Register"  component={RegisterScreen} />
        <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
        <Stack.Screen name="LikedYou" component={LikeYouScreen} />
        <Stack.Screen name="ViewAgain" component={ViewAgainScreen} />


      </Stack.Navigator>
    </NavigationContainer>
  );
}