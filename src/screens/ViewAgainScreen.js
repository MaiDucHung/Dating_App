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

export default function ViewAgainScreen() {
  const navigation = useNavigation();
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    const fetchDislikedProfiles = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          Alert.alert("Error", "No authentication token found!");
          return;
        }

        const response = await fetch(`${BASE_URL}/api/profiles/disliked`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();
        if (response.ok) {
          setProfiles(result);
        } else {
          Alert.alert("Error", result.message || "Failed to fetch disliked profiles!");
        }
      } catch (error) {
        console.error("Error fetching disliked profiles:", error);
        Alert.alert("Error", "Unable to connect to the server!");
      }
    };
    fetchDislikedProfiles();
  }, []);

  const handleRelike = async (user2Id) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/matches/like-after`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user2Id, status: "pending" }),
      });

      const result = await response.json();
      if (response.ok) {
        setProfiles(profiles.filter(profile => profile.id !== user2Id));
        if (result.status === 'accepted') {
          Alert.alert("Success", "You have a new match!");
        }
      } else {
        Alert.alert("Error", result.message || "Failed to record match!");
      }
    } catch (error) {
      console.error("Error recording match:", error);
      Alert.alert("Error", "Unable to connect to the server!");
    }
  };

  const renderProfile = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.photos[0]?.imgUrl }}
        style={styles.profileImage}
      />
      <View style={styles.infoBox}>
        <Text style={styles.name}>
          {item.username}, {item.age}
        </Text>
        <Text style={styles.subText}>{item.city}</Text>
        <Text style={styles.bio} numberOfLines={4}>
          {item.bio}
        </Text>
        <View style={styles.tagsContainer}>
          {item.hobbies?.map((hobby, i) => (
            <Text key={i} style={styles.tag}>
              {hobby}
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.matchButton} onPress={() => handleRelike(item.id)}>
          <Text style={styles.buttonText}>Like Again</Text>
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
        <Text style={styles.headerText}>View Again</Text>
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
          <Text style={styles.noProfilesText}>No profiles to view again</Text>
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
    justifyContent: "center",
    padding: 10,
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