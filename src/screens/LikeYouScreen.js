import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../config";

export default function LikeYouScreen() {
  const navigation = useNavigation();
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    const fetchPendingLikes = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          Alert.alert("Error", "No authentication token found!");
          return;
        }

        console.log("Fetching pending likes with token:", token);
        const response = await fetch(`${BASE_URL}/api/profiles/pending-likes`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Pending likes response status:", response.status);
        const result = await response.json();
        console.log("Pending likes response result:", result);

        if (response.ok) {
          const uniqueProfiles = Array.from(new Map(result.map(item => [item.id, item])).values());
          setProfiles(uniqueProfiles);
        } else {
          Alert.alert("Error", result.message || "Failed to fetch pending likes!");
        }
      } catch (error) {
        console.error("Error fetching pending likes:", error);
        Alert.alert("Error", "Unable to connect to the server! " + error.message);
      }
    };
    fetchPendingLikes();
  }, []);

  const handleLike = async (user2Id) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      console.log("Sending like request for user2Id:", user2Id);
      const matchResponse = await fetch(`${BASE_URL}/api/profiles/match`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user2Id, status: "pending" }),
      });

      console.log("Match response status:", matchResponse.status);
      const matchResult = await matchResponse.json();
      console.log("Match response result:", matchResult);

      if (matchResponse.ok) {
        setProfiles(profiles.filter(profile => profile.id !== user2Id));
        if (matchResult.status === 'accepted') {
          Alert.alert("Success", "You have a new match!");

          // Send notification after successful match
          const notifyPayload = { user2Id, message: "You have new match" };
          const notifyResponse = await fetch(`${BASE_URL}/api/notifications/notify-like`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(notifyPayload),
          });

          const notifyResult = await notifyResponse.json();
          if (!notifyResponse.ok) {
            console.error("Failed to notify like:", notifyResult.message || "Unknown error");
          }
        }
      } else {
        Alert.alert("Error", matchResult.message || "Failed to record match!");
      }
    } catch (error) {
      console.error("Error in handleLike:", error);
      Alert.alert("Error", "Unable to connect to the server! " + error.message);
    }
  };

  const handleDislike = async (user2Id) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      console.log("Sending dislike request for user2Id:", user2Id);
      const response = await fetch(`${BASE_URL}/api/profiles/match`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user2Id, status: "unmatched" }),
      });

      console.log("Dislike response status:", response.status);
      const result = await response.json();
      console.log("Dislike response result:", result);

      if (response.ok) {
        setProfiles(profiles.filter(profile => profile.id !== user2Id));
      } else {
        Alert.alert("Error", result.message || "Failed to record dislike!");
      }
    } catch (error) {
      console.error("Error recording dislike:", error);
      Alert.alert("Error", "Unable to connect to the server! " + error.message);
    }
  };

  const renderProfile = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={{
          uri: item.photos[0]?.imgUrl || "https://via.placeholder.com/300",
        }}
        style={styles.profileImage}
        onError={(e) => console.log("Image load error for user", item.id, ":", e.nativeEvent.error)}
      />
      <View style={styles.infoBox}>
        <Text style={styles.name}>
          {item.username || "Unknown"}, {item.age || "N/A"}
        </Text>
        <Text style={styles.subText}>{item.city || "Unknown City"}</Text>
        <Text style={styles.bio} numberOfLines={4}>
          {item.bio || "No bio available"}
        </Text>
        <View style={styles.tagsContainer}>
          {item.hobbies?.length > 0 ? (
            item.hobbies.map((hobby, i) => (
              <Text key={i} style={styles.tag}>
                {hobby}
              </Text>
            ))
          ) : (
            <Text style={styles.tag}>No hobbies listed</Text>
          )}
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.unmatchButton} onPress={() => handleDislike(item.id)}>
          <Text style={styles.buttonText}>Dislike</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.matchButton} onPress={() => handleLike(item.id)}>
          <Text style={styles.buttonText}>Like</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeftIcon size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>People Who Liked You</Text>
      </View>
      {profiles.length > 0 ? (
        <FlatList
          data={profiles}
          renderItem={renderProfile}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.noProfilesContainer}>
          <Text style={styles.noProfilesText}>No one has liked you yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: hp(5),
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginLeft: 10,
  },
  iconBtn: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 50,
    padding: 10,
  },
  listContainer: {
    paddingBottom: hp(10),
  },
  card: {
    width: wp(90),
    marginHorizontal: wp(5),
    marginVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  profileImage: {
    width: "100%",
    height: hp(40),
    resizeMode: "cover",
  },
  infoBox: {
    padding: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  subText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  bio: {
    marginTop: 8,
    fontSize: 15,
    color: "#374151",
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  tag: {
    backgroundColor: "#FFE4E6",
    color: "#FE3C72",
    fontWeight: "600",
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
  },
  unmatchButton: {
    backgroundColor: "red",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: "center",
    width: wp(40),
  },
  matchButton: {
    backgroundColor: "#FE3C72",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: "center",
    width: wp(40),
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  noProfilesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noProfilesText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
});