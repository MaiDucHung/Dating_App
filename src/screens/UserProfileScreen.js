import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../config";
import {
  ChevronLeftIcon,
  EllipsisHorizontalIcon,
  TrashIcon,
} from "react-native-heroicons/solid";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId: otherUserId, chatId, imgUrl, name, age } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null); // Ảnh được chọn để hiển thị to
  const [currentUserId, setCurrentUserId] = useState(null); // ID user hiện tại

  useEffect(() => {
    fetchProfile();
    fetchCurrentUserId();
  }, []);

  const fetchCurrentUserId = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.warn("No token found for fetching current user ID");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/profiles/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (response.ok) {
        setCurrentUserId(result.userId);
        console.log("Current user ID:", result.userId);
      } else {
        console.warn("Failed to fetch current user ID:", result.message);
      }
    } catch (error) {
      console.error("Error fetching current user ID:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      console.log("Fetching profile for userId:", otherUserId);
      const response = await fetch(`${BASE_URL}/api/profiles/${otherUserId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      console.log("API response:", result);
      if (response.ok) {
        setProfile(result);
      } else {
        Alert.alert("Error", result.message || "Failed to fetch profile!");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Unable to connect to the server!");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/profiles/${otherUserId}/block`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (response.ok) {
        Alert.alert("Success", "User blocked successfully!");
        setMenuVisible(false);
        navigation.goBack();
      } else {
        Alert.alert("Error", result.message || "Failed to block user!");
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      Alert.alert("Error", "Unable to connect to the server!");
    }
  };

  const handleReportUser = async (reportType) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/profiles/${otherUserId}/report`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reportType }),
      });

      const result = await response.json();
      if (response.ok) {
        Alert.alert("Success", "User reported successfully!");
        setReportModalVisible(false);
        setMenuVisible(false);
      } else {
        Alert.alert("Error", result.message || "Failed to report user!");
      }
    } catch (error) {
      console.error("Error reporting user:", error);
      Alert.alert("Error", "Unable to connect to the server!");
    }
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/photos/${photoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (response.ok) {
        Alert.alert("Success", "Photo deleted successfully!");
        setSelectedPhoto(null); // Đóng modal ảnh
        fetchProfile(); // Cập nhật danh sách ảnh
      } else {
        Alert.alert("Error", result.message || "Failed to delete photo!");
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      Alert.alert("Error", "Unable to connect to the server!");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FE3C72" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text>Profile not found...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header with Back Button and Ellipsis */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeftIcon size={hp(3.5)} color="#fff" strokeWidth={1.5} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsButton} onPress={() => setMenuVisible(true)}>
          <EllipsisHorizontalIcon size={hp(3.5)} color="#fff" strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      {/* Profile Image */}
      <TouchableOpacity onPress={() => setSelectedPhoto({ imgUrl: profile.avatar })}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: profile.avatar || "https://via.placeholder.com/150" }}
            style={styles.profileImage}
          />
        </View>
      </TouchableOpacity>

      {/* Bio Section */}
      <View style={styles.bioContainer}>
        <View style={styles.nameAgeContainer}>
          <View style={styles.nameAge}>
            <Text style={styles.nameText}>{profile.name}, {profile.age}</Text>
          </View>
        </View>

        <View style={styles.bioTextContainer}>
          <Text style={styles.bioLabel}>BIO</Text>
          <Text style={styles.bioText}>{profile.bio || "No bio available"}</Text>
        </View>

        <View style={styles.hobbiesContainer}>
          <View style={styles.hobbiesList}>
            {profile.hobbies?.length > 0 ? (
              profile.hobbies.map((hobby, index) => (
                <View key={index} style={styles.hobbyTag}>
                  <Text style={styles.hobbyText}>{hobby}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.bioText}>No hobbies</Text>
            )}
          </View>
        </View>

        <View style={styles.personalInfoContainer}>
          <Text style={styles.bioLabel}>Personal Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Height:</Text>
            <Text style={styles.bioText}>{profile.height || 0} cm</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.occupationEducation}>
              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>Occupation:</Text>
                <Text style={styles.bioText}>{profile.occupation || "Not specified"}</Text>
              </View>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.occupationEducation}>
              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>Education:</Text>
                <Text style={styles.bioText}>{profile.education || "Not specified"}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.lookingForContainer}>
          <Text style={styles.bioLabel}>Looking For</Text>
          <Text style={styles.bioText}>{profile.looking_for || "Not specified"}</Text>
        </View>

        <View style={styles.photosContainer}>
          <Text style={styles.photosLabel}>Photos</Text>
          <FlatList
            data={profile.photos || []}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosList}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setSelectedPhoto(item)}>
                <View style={styles.photoWrapper}>
                  <Image
                    source={{ uri: item.imgUrl || "https://via.placeholder.com/100" }}
                    style={styles.photoItem}
                  />
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.bioText}>No photos available</Text>}
          />
        </View>
      </View>

      {/* Menu Modal for Block/Report */}
      <Modal
        transparent={true}
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalOption} onPress={handleBlockUser}>
              <Text style={styles.modalText}>Block User</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setMenuVisible(false);
                setReportModalVisible(true);
              }}
            >
              <Text style={styles.modalText}>Report User</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Type Modal */}
      <Modal
        transparent={true}
        visible={reportModalVisible}
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setReportModalVisible(false)}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleReportUser("inappropriate_content")}
            >
              <Text style={styles.modalText}>Inappropriate Content</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleReportUser("harassment")}
            >
              <Text style={styles.modalText}>Harassment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleReportUser("spam")}
            >
              <Text style={styles.modalText}>Spam</Text>
            </TouchableOpacity>
             <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleReportUser("spam")}
            >
              <Text style={styles.modalText}>Spam</Text>
            </TouchableOpacity>
             <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleReportUser("spam")}
            >
              <Text style={styles.modalText}>Spam</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Photo Preview Modal */}
      <Modal
        transparent={true}
        visible={!!selectedPhoto}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setSelectedPhoto(null)}>
          <View style={styles.photoModalContent}>
            <Image
              source={{ uri: selectedPhoto?.imgUrl || "https://via.placeholder.com/300" }}
              style={styles.largePhoto}
            />
            {currentUserId && currentUserId === otherUserId && selectedPhoto?.id && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePhoto(selectedPhoto.id)}
              >
                <TrashIcon size={hp(3)} color="#fff" strokeWidth={1.5} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  contentContainer: { paddingBottom: 20 },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FE3C72",
  },
  backButton: { padding: 8 },
  settingsButton: { padding: 8 },
  imageContainer: { alignItems: "center", marginVertical: 20 },
  profileImage: {
    width: wp(40),
    height: wp(40),
    borderRadius: wp(20),
    borderWidth: 2,
    borderColor: "#FE3C72",
  },
  bioContainer: { paddingHorizontal: 16 },
  nameAgeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  nameAge: { flexDirection: "row", alignItems: "center" },
  nameText: { fontSize: 24, fontWeight: "bold", color: "#1F2937" },
  bioTextContainer: { marginBottom: 20 },
  bioLabel: { fontSize: 18, fontWeight: "600", color: "#1F2937", marginBottom: 8 },
  bioText: { fontSize: 16, color: "#6B7280" },
  hobbiesContainer: { marginBottom: 20 },
   hobbiesContainer: {
    marginBottom: 20,
  },
  hobbiesList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  hobbyTag: {
    backgroundColor: "pink",
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  hobbyText: {
    fontSize: 14,
    color: "white",
  },
  personalInfoContainer: { marginBottom: 20 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  occupationEducation: { flexDirection: "row", justifyContent: "space-between", flex: 1 },
  infoColumn: { flexDirection: "row", alignItems: "center" },
  infoLabel: { fontSize: 16, fontWeight: "500", color: "#1F2937", marginRight: 8 },
  lookingForContainer: { marginBottom: 20 },
  photosContainer: { marginBottom: 20 },
  photosLabel: { fontSize: 18, fontWeight: "600", color: "#1F2937", marginBottom: 8 },
  photosList: { paddingHorizontal: 8 },
  photoWrapper: { position: "relative", marginRight: 8 },
  photoItem: { width: wp(25), height: wp(25), borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  modalOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalText: { fontSize: 16, color: "#1F2937" },
  photoModalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  largePhoto: { width: wp(80), height: wp(80), borderRadius: 10 },
  deleteButton: {
    position: "absolute",
    top: hp(2),
    right: wp(2),
    backgroundColor: "rgba(255, 0, 0, 0.7)",
    borderRadius: 20,
    padding: 5,
  },
});