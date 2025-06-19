import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Modal,
  Alert,
  TextInput,
  Switch,
} from "react-native"; // Thêm Switch
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { CogIcon, TrashIcon, PlusIcon, XMarkIcon } from "react-native-heroicons/outline";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import user from "../../assets/images/index";
import { BASE_URL } from "../../config";
import * as ImagePicker from "expo-image-picker";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [data, setData] = useState(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedUsersModalVisible, setBlockedUsersModalVisible] = useState(false);
  const options = ["Friendship", "Dating", "Serious"];
  const [lookingForModalVisible, setLookingForModalVisible] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      console.log("Token used:", token);
      const response = await fetch(`${BASE_URL}/api/profiles/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      console.log("Profile API response:", result);
      if (response.ok) {
        setData(result);
        setEditedData(result);
      } else {
        Alert.alert("Error", result.message || "Failed to fetch profile!");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Unable to connect to the server!");
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedData(data);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/profiles/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editedData.name,
          age: parseInt(editedData.age),
          bio: editedData.bio,
          hobbies: editedData.hobbies,
          height: parseInt(editedData.height || 0),
          occupation: editedData.occupation,
          education: editedData.education,
          looking_for: editedData.looking_for,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setData(editedData);
        setIsEditing(false);
        Alert.alert("Success", "Profile updated successfully!");
      } else {
        Alert.alert("Error", result.message || "Failed to update profile!");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Unable to connect to the server!");
    }
  };

 const deletePhoto = async (photoId) => {
  try {
    if (!photoId) {
      Alert.alert("Error", "Invalid photo ID!");
      return;
    }

    const token = await AsyncStorage.getItem("token");
    console.log("Token used for delete:", token);
    if (!token) {
      Alert.alert("Error", "No authentication token found!");
      return;
    }

    console.log("Deleting photo with ID:", photoId);
    const response = await fetch(`${BASE_URL}/api/photos/${photoId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    console.log("Delete response:", response.status, result);

    if (response.ok) {
      await fetchProfile();
      Alert.alert("Success", "Photo deleted successfully!");
    } else {
      Alert.alert("Error", result.message || "Failed to delete photo!");
    }
  } catch (error) {
    console.error("Error deleting photo:", error);
    Alert.alert("Error", "Unable to connect to the server!");
  }
};

  const handleAddPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Error", "Permission to access media library was denied!");
        return;
      }

      console.log("ImagePicker.MediaTypeOptions:", ImagePicker.MediaTypeOptions);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) {
        console.log("User cancelled image picker");
        return;
      }

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      const formData = new FormData();
      formData.append("photo", {
        uri: result.assets[0].uri,
        type: "image/jpeg",
        name: "photo.jpg",
      });

      const uploadResponse = await fetch(`${BASE_URL}/api/photos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const uploadResult = await uploadResponse.json();
      if (uploadResponse.ok) {
        const newPhoto = {
          id: uploadResult.photoId,
          imgUrl: uploadResult.photoUrl,
        };
        setData((prev) => ({
          ...prev,
          photos: [...(prev.photos || []), newPhoto],
        }));
        setEditedData((prev) => ({
          ...prev,
          photos: [...(prev.photos || []), newPhoto],
        }));
        Alert.alert("Success", "Photo uploaded successfully!");
      } else {
        Alert.alert("Error", uploadResult.message || "Failed to upload photo!");
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      Alert.alert("Error", "Unable to connect to the server!");
    }
  };

 const fetchBlockedUsers = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    console.log("Token used for blocked users:", token); // Log token
    if (!token) {
      Alert.alert("Error", "No authentication token found!");
      return;
    }

    const response = await fetch(`${BASE_URL}/api/users/blocked`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Fetch blocked users response status:", response.status);
    const result = await response.json();
    console.log("Fetch blocked users response:", result);

    if (response.ok) {
      setBlockedUsers(result);
      setBlockedUsersModalVisible(true);
    } else {
      Alert.alert("Error", result.message || "Failed to fetch blocked users!");
    }
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    Alert.alert("Error", "Unable to connect to the server!");
  }
};

  const unblockUser = async (blockedId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/users/blocked/${blockedId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        setBlockedUsers(blockedUsers.filter((user) => user.id !== blockedId));
        Alert.alert("Success", "User unblocked successfully!");
      } else {
        Alert.alert("Error", result.message || "Failed to unblock user!");
      }
    } catch (error) {
      console.error("Error unblocking user:", error);
      Alert.alert("Error", "Unable to connect to the server!");
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (!token) {
                Alert.alert("Error", "No authentication token found!");
                return;
              }

              const response = await fetch(`${BASE_URL}/api/users/me`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              const result = await response.json();
              if (response.ok) {
                await AsyncStorage.removeItem("token");
                await AsyncStorage.removeItem("userId");
                Alert.alert("Success", "Account deleted successfully.");
                setSettingsModalVisible(false);
                navigation.navigate("Welcome");
              } else {
                Alert.alert("Error", result.message || "Failed to delete account!");
              }
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert("Error", "Unable to connect to the server!");
            }
          },
        },
      ]
    );
  };

  const handlePauseProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      const newIsActive = data.is_active === 1 ? 0 : 1; // Toggle trạng thái
      const response = await fetch(`${BASE_URL}/api/users/me/pause`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: newIsActive }),
      });

      const result = await response.json();
      if (response.ok) {
        setData((prev) => ({ ...prev, is_active: newIsActive }));
        setSettingsModalVisible(false);
        Alert.alert("Success", `Profile ${newIsActive === 1 ? "paused" : "reactivated"} successfully!`);
      } else {
        Alert.alert("Error", result.message || "Failed to update profile status!");
      }
    } catch (error) {
      console.error("Error pausing/reactivating profile:", error);
      Alert.alert("Error", "Unable to connect to the server!");
    }
  };

  if (!data || !editedData) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: data.imgUrl || user }}
          style={styles.profileImage}
        />
      </View>

      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setSettingsModalVisible(true)}
        >
          <CogIcon size={hp(3.5)} color="white" strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      <View style={styles.bioContainer}>
        <View style={styles.nameAgeContainer}>
          <View style={styles.nameAge}>
            {isEditing ? (
              <View style={styles.editNameAgeContainer}>
                <TextInput
                  style={styles.editInput}
                  value={editedData.name}
                  onChangeText={(text) => setEditedData({ ...editedData, name: text })}
                  placeholder="Name"
                />
                <TextInput
                  style={[styles.editInput, { width: wp(20) }]}
                  value={editedData.age.toString()}
                  onChangeText={(text) => setEditedData({ ...editedData, age: text })}
                  placeholder="Age"
                  keyboardType="numeric"
                />
              </View>
            ) : (
              <Text style={styles.nameText}>
                {data.name}, {data.age}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleEditToggle}>
            <Text style={styles.editText}>{isEditing ? "Cancel" : "Edit"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bioTextContainer}>
          <Text style={styles.bioLabel}>BIO</Text>
          {isEditing ? (
            <TextInput
              style={[styles.editInput, { width: "100%", height: hp(10) }]}
              value={editedData.bio || ""}
              onChangeText={(text) => setEditedData({ ...editedData, bio: text })}
              placeholder="Bio"
              multiline
            />
          ) : (
            <Text style={styles.bioText}>{data.bio || "No bio available"}</Text>
          )}
        </View>

        <View style={styles.hobbiesContainer}>
          <View style={styles.hobbiesList}>
            {isEditing ? (
              <TextInput
                style={[styles.editInput, { width: "100%" }]}
                value={editedData.hobbies.join(", ")}
                onChangeText={(text) =>
                  setEditedData({ ...editedData, hobbies: text.split(", ") })
                }
                placeholder="Hobbies (comma separated)"
              />
            ) : data.hobbies?.length > 0 ? (
              data.hobbies.map((hobby, index) => (
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
            {isEditing ? (
              <TextInput
                style={[styles.editInput, { width: wp(20) }]}
                value={editedData.height?.toString() || ""}
                onChangeText={(text) => setEditedData({ ...editedData, height: text })}
                placeholder="Height (cm)"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.bioText}>{data.height || "Not specified"} cm</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <View style={styles.occupationEducation}>
              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>Occupation:</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.editInput, { width: wp(35) }]}
                    value={editedData.occupation || ""}
                    onChangeText={(text) => setEditedData({ ...editedData, occupation: text })}
                    placeholder="Occupation"
                  />
                ) : (
                  <Text style={styles.bioText}>{data.occupation || "Not specified"}</Text>
                )}
              </View>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.occupationEducation}>
              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>Education:</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.editInput, { width: wp(35) }]}
                    value={editedData.education || ""}
                    onChangeText={(text) => setEditedData({ ...editedData, education: text })}
                    placeholder="Education"
                  />
                ) : (
                  <Text style={styles.bioText}>{data.education || "Not specified"}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.lookingForContainer}>
          <Text style={styles.bioLabel}>Looking For</Text>
          {isEditing ? (
            <TouchableOpacity
              style={[styles.editInput, { width: "100%", justifyContent: "center" }]}
              onPress={() => setLookingForModalVisible(true)}
            >
              <Text style={styles.bioText}>{editedData.looking_for || "Select an option"}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.bioText}>{data.looking_for || "Not specified"}</Text>
          )}
        </View>

        <View style={styles.photosContainer}>
          <View style={styles.photosHeader}>
            <Text style={styles.photosLabel}>My Photos</Text>
            {isEditing && (
              <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
                <PlusIcon size={hp(2.5)} color="#FE3C72" strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={data.photos || []}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosList}
            renderItem={({ item }) => (
              <View style={styles.photoWrapper}>
                <Image
                  source={{ uri: item.imgUrl || "https://via.placeholder.com/100/FF0000/FFFFFF?text=No+Image/100" }}
                  style={styles.photoItem}
                />
                {isEditing && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deletePhoto(item.id)}
                  >
                    <TrashIcon size={hp(2.5)} color="#FF3B30" strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            ListEmptyComponent={<Text style={styles.bioText}>No photos available</Text>}
          />
        </View>

        {isEditing && (
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleEditToggle}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Settings</Text>

            <View style={styles.modalOption}>
              <Text style={styles.modalOptionText}>Pause Profile</Text>
              <Switch
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={data.is_active ? "#f5dd4b" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={handlePauseProfile}
                value={data.is_active === 1} // Toggle dựa trên is_active
              />
            </View>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                fetchBlockedUsers();
                setSettingsModalVisible(false);
              }}
            >
              <Text style={styles.modalOptionText}>Blocked Users</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleDeleteAccount}
            >
              <Text style={[styles.modalOptionText, { color: "#FF3B30" }]}>Delete Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setSettingsModalVisible(false);
                navigation.navigate("Welcome");
              }}
            >
              <Text style={[styles.modalOptionText, { color: "#FE3C72" }]}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Blocked Users Modal */}
     <Modal
  animationType="slide"
  transparent={true}
  visible={blockedUsersModalVisible}
  onRequestClose={() => setBlockedUsersModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>Blocked Users</Text>
      <FlatList
        data={blockedUsers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.blockedUserCard}>
            <Text style={styles.blockedUserName}>{item.name || "Unknown"}</Text>
            <TouchableOpacity
              style={styles.unblockButton}
              onPress={() => unblockUser(item.id)}
            >
              <XMarkIcon size={hp(2.5)} color="#FF3B30" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.bioText}>No blocked users</Text>}
        style={{ width: "100%" }}
      />
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setBlockedUsersModalVisible(false)}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

      {/* Looking For Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={lookingForModalVisible}
        onRequestClose={() => setLookingForModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Looking For</Text>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOption}
                onPress={() => {
                  setEditedData({ ...editedData, looking_for: option });
                  setLookingForModalVisible(false);
                }}
              >
                <Text style={styles.modalOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setLookingForModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    paddingBottom: hp(5),
  },
  imageContainer: {
    position: "relative",
  },
  profileImage: {
    width: wp(100),
    height: hp(60),
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  headerContainer: {
    position: "absolute",
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: hp(5),
  },
  settingsButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "#FE3C72",
    marginRight: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  bioContainer: {
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    marginTop: 24,
  },
  nameAgeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  nameAge: {
    flexDirection: "row",
  },
  editNameAgeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  nameText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
  },
  editButton: {
    backgroundColor: "#FE3C72",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#F9FAFB",
  },
  hobbiesContainer: {
    marginBottom: 16,
  },
  hobbiesList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  hobbyTag: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#FE3C72",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hobbyText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  personalInfoContainer: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  occupationEducation: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  infoColumn: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginRight: 8,
  },
  bioTextContainer: {
    marginBottom: 16,
  },
  bioLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  bioText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#374151",
    lineHeight: 24,
  },
  lookingForContainer: {
    marginBottom: 24,
  },
  photosContainer: {
    width: "100%",
  },
  photosHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  photosLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  addPhotoButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "#FFE4E6",
    marginBottom: 12,
  },
  photosList: {
    paddingVertical: 4,
  },
  photoWrapper: {
    position: "relative",
  },
  photoItem: {
    width: wp(30),
    height: wp(40),
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 999,
    padding: 4,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 24,
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  saveButton: {
    backgroundColor: "#FE3C72",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: wp(80),
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 20,
  },
  modalOption: {
    paddingVertical: 12,
    width: "100",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#FE3C72",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FE3C72",
  },
  blockedUserCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    width: "100%",
    justifyContent: "space-between",
  },
  blockedUserAvatar: {
    width: wp(15),
    height: wp(15),
    borderRadius: 50,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  blockedUserName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    marginRight: 10,
  },
  unblockButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: "#FFE4E6",
  },
});