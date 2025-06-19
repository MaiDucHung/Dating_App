import React, { useState, useEffect } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

import { BASE_URL } from "../../config";

export default function NewUserScreen({ navigation }) {
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [location, setLocation] = useState(null);
  const [city, setCity] = useState(null);
  const [height, setHeight] = useState("");
  const [occupation, setOccupation] = useState("");
  const [education, setEducation] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState(null);
  const [relationshipStatusOpen, setRelationshipStatusOpen] = useState(false);
  const [relationshipStatusItems, setRelationshipStatusItems] = useState([
    { label: "Single", value: "single" },
    { label: "Married", value: "married" },
    { label: "Divorced", value: "divorced" },
    { label: "Widowed", value: "widowed" },
    { label: "Complicated", value: "complicated" },
  ]);

  const [lookingFor, setLookingFor] = useState(null);
  const [lookingForOpen, setLookingForOpen] = useState(false);
  const [lookingForItems, setLookingForItems] = useState([
    { label: "Friendship", value: "friendship" },
    { label: "Dating", value: "dating" },
    { label: "Serious Relationship", value: "serious" },
  ]);

  const [cityOpen, setCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityItems] = useState([
    { label: "An Giang", value: "An Giang" },
    { label: "Ba Ria - Vung Tau", value: "Ba Ria - Vung Tau" },
    { label: "Bac Lieu", value: "Bac Lieu" },
    { label: "Bac Giang", value: "Bac Giang" },
    { label: "Bac Kan", value: "Bac Kan" },
    { label: "Bac Ninh", value: "Bac Ninh" },
    { label: "Ben Tre", value: "Ben Tre" },
    { label: "Binh Duong", value: "Binh Duong" },
    { label: "Binh Dinh", value: "Binh Dinh" },
    { label: "Binh Phuoc", value: "Binh Phuoc" },
    { label: "Binh Thuan", value: "Binh Thuan" },
    { label: "Ca Mau", value: "Ca Mau" },
    { label: "Cao Bang", value: "Cao Bang" },
    { label: "Can Tho", value: "Can Tho" },
    { label: "Da Nang", value: "Da Nang" },
    { label: "Dak Lak", value: "Dak Lak" },
    { label: "Dak Nong", value: "Dak Nong" },
    { label: "Dien Bien", value: "Dien Bien" },
    { label: "Dong Nai", value: "Dong Nai" },
    { label: "Dong Thap", value: "Dong Thap" },
    { label: "Gia Lai", value: "Gia Lai" },
    { label: "Ha Giang", value: "Ha Giang" },
    { label: "Ha Nam", value: "Ha Nam" },
    { label: "Ha Noi", value: "Ha Noi" },
    { label: "Ha Tinh", value: "Ha Tinh" },
    { label: "Hai Duong", value: "Hai Duong" },
    { label: "Hai Phong", value: "Hai Phong" },
    { label: "Hau Giang", value: "Hau Giang" },
    { label: "Hoa Binh", value: "Hoa Binh" },
    { label: "Hung Yen", value: "Hung Yen" },
    { label: "Khanh Hoa", value: "Khanh Hoa" },
    { label: "Kien Giang", value: "Kien Giang" },
    { label: "Kon Tum", value: "Kon Tum" },
    { label: "Lai Chau", value: "Lai Chau" },
    { label: "Lam Dong", value: "Lam Dong" },
    { label: "Lang Son", value: "Lang Son" },
    { label: "Lao Cai", value: "Lao Cai" },
    { label: "Long An", value: "Long An" },
    { label: "Nam Dinh", value: "Nam Dinh" },
    { label: "Nghe An", value: "Nghe An" },
    { label: "Ninh Binh", value: "Ninh Binh" },
    { label: "Ninh Thuan", value: "Ninh Thuan" },
    { label: "Phu Tho", value: "Phu Tho" },
    { label: "Phu Yen", value: "Phu Yen" },
    { label: "Quang Binh", value: "Quang Binh" },
    { label: "Quang Nam", value: "Quang Nam" },
    { label: "Quang Ngai", value: "Quang Ngai" },
    { label: "Quang Ninh", value: "Quang Ninh" },
    { label: "Quang Tri", value: "Quang Tri" },
    { label: "Soc Trang", value: "Soc Trang" },
    { label: "Son La", value: "Son La" },
    { label: "Tay Ninh", value: "Tay Ninh" },
    { label: "Thai Binh", value: "Thai Binh" },
    { label: "Thai Nguyen", value: "Thai Nguyen" },
    { label: "Thanh Hoa", value: "Thanh Hoa" },
    { label: "Thua Thien Hue", value: "Thua Thien Hue" },
    { label: "Tien Giang", value: "Tien Giang" },
    { label: "Ho Chi Minh City", value: "Ho Chi Minh City" },
    { label: "Tra Vinh", value: "Tra Vinh" },
    { label: "Tuyen Quang", value: "Tuyen Quang" },
    { label: "Vinh Long", value: "Vinh Long" },
    { label: "Vinh Phuc", value: "Vinh Phuc" },
    { label: "Yen Bai", value: "Yen Bai" },
  ]);
  
  const [filteredCityItems, setFilteredCityItems] = useState(cityItems);

  const [image, setImage] = useState(null);

   const API_URL = `${BASE_URL}`;
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Permission to access location was denied. Location will be set to null.");
          setLocation(null);
          return;
        }

        let userLocation = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = userLocation.coords;
        setLocation(`${latitude}, ${longitude}`);
      } catch (error) {
        console.error("Error getting location:", error);
        Alert.alert("Error", "Unable to fetch location. Location will be set to null.");
        setLocation(null);
      }
    })();
  }, []);

  // Lọc danh sách tỉnh thành dựa trên từ khóa tìm kiếm
  const handleCitySearch = (text) => {
    setCitySearch(text);
    if (text) {
      const filtered = cityItems.filter((item) =>
        item.label.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCityItems(filtered.length > 0 ? filtered : cityItems); // Đảm bảo luôn có danh sách
    } else {
      setFilteredCityItems(cityItems); // Hiển thị toàn bộ danh sách khi không tìm kiếm
    }
//console.log("Filtered city items:", filteredCityItems); // Debug log
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Image,
      allowsEditing: true,
      aspect: [4, 4],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (token, imageUri) => {
    try {
      const formData = new FormData();
      formData.append("photo", {
        uri: imageUri,
        name: `profile_${Date.now()}.jpg`,
        type: "image/jpeg",
      });

      const response = await fetch(`${API_URL}/api/profiles/upload-photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const data = await response.json();
      console.log("Upload response:", data);
      if (!response.ok) {
        throw new Error(data.message || "Failed to upload photo");
      }
      return data.photo_url;
    } catch (error) {
      console.error("Image upload error:", error);
      Alert.alert("Error", "Failed to upload profile photo!");
      return null;
    }
  };

  const handleUpdate = async () => {
    if (!height || !relationshipStatus || !lookingFor || !city) {
      Alert.alert("Error", "Please fill in all required fields!");
      return;
    }

    const heightValue = parseInt(height, 10);
    if (isNaN(heightValue) || heightValue < 80 || heightValue > 200) {
      Alert.alert("Error", "Height must be a number between 80cm and 200cm!");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found!");
        navigation.navigate("Login");
        return;
      }

      let photoUrl = null;
      if (image) {
        photoUrl = await uploadImage(token, image);
        if (!photoUrl) return;
      }

      console.log("Sending profile data:", {
        bio: bio || null,
        interests: interests || null,
        location: location || null,
        city,
        height: heightValue,
        occupation: occupation || null,
        education: education || null,
        relationship_status: relationshipStatus,
        looking_for: lookingFor,
      });

      const profileResponse = await fetch(`${API_URL}/api/profiles/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bio: bio || null,
          interests: interests || null,
          location: location || null,
          city,
          height: heightValue,
          occupation: occupation || null,
          education: education || null,
          relationship_status: relationshipStatus,
          looking_for: lookingFor,
        }),
      });

      const profileData = await profileResponse.json();
      console.log("Profile update response:", profileData);
      if (profileResponse.ok) {
        Alert.alert("Success", "Profile updated successfully!", [
          { text: "OK", onPress: () => navigation.navigate("HomeTabs") },
        ]);
      } else {
        Alert.alert("Error", profileData.message || "Failed to update profile!");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Unable to connect to the server!");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView
        style={styles.container}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate("Welcome")}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Add Photo</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Profile Photo</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              <Text style={styles.imagePickerText}>
                {image ? "Change Photo" : "Select Profile Photo"}
              </Text>
            </TouchableOpacity>
            {image && <Image source={{ uri: image }} style={styles.imagePreview} />}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, { height: hp("10%") }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself (optional)"
              placeholderTextColor="#B0B0B0"
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Interests</Text>
            <TextInput
              style={styles.input}
              value={interests}
              onChangeText={setInterests}
              placeholder="e.g., hiking, music, cooking (optional)"
              placeholderTextColor="#B0B0B0"
            />
          </View>

          {/* <View style={styles.inputGroup}>
            <Text style={styles.label}>Location (Latitude, Longitude)</Text>
            <TextInput
              style={styles.input}
              value={location || "Not available"}
              placeholder="Location will be auto-filled or set to null"
              placeholderTextColor="#B0B0B0"
              editable={false}
            />
          </View> */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <DropDownPicker
              open={cityOpen}
              value={city}
              items={filteredCityItems}
              setOpen={setCityOpen}
              setValue={setCity}
              setItems={setFilteredCityItems} // Sử dụng filteredCityItems để cập nhật
              searchable={true}
              searchPlaceholder="Search for a city..."
              onChangeSearchText={handleCitySearch}
              placeholder="Select your city"
              style={styles.dropdown}
              dropDownContainerStyle={{
                ...styles.dropdownContainer,
                maxHeight: 200,
              }}
              zIndex={4000}
              zIndexInverse={1000}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              placeholder="Enter your height in cm"
              placeholderTextColor="#B0B0B0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Occupation</Text>
            <TextInput
              style={styles.input}
              value={occupation}
              onChangeText={setOccupation}
              placeholder="e.g., Software Engineer (optional)"
              placeholderTextColor="#B0B0B0"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Education</Text>
            <TextInput
              style={styles.input}
              value={education}
              onChangeText={setEducation}
              placeholder="e.g., Bachelor's in Computer Science (optional)"
              placeholderTextColor="#B0B0B0"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Relationship Status</Text>
            <DropDownPicker
              open={relationshipStatusOpen}
              value={relationshipStatus}
              items={relationshipStatusItems}
              setOpen={setRelationshipStatusOpen}
              setValue={setRelationshipStatus}
              setItems={setRelationshipStatusItems}
              placeholder="Select Relationship Status"
              style={styles.dropdown}
              dropDownContainerStyle={{
                ...styles.dropdownContainer,
                maxHeight: 200,
              }}
              zIndex={3000}
              zIndexInverse={3000}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Looking For</Text>
            <DropDownPicker
              open={lookingForOpen}
              value={lookingFor}
              items={lookingForItems}
              setOpen={setLookingForOpen}
              setValue={setLookingFor}
              setItems={setLookingForItems}
              placeholder="Select What You're Looking For"
              style={styles.dropdown}
              dropDownContainerStyle={{
                ...styles.dropdownContainer,
                maxHeight: 200,
              }}
              zIndex={2000}
              zIndexInverse={4000}
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleUpdate}>
            <Text style={styles.submitButtonText}>Save and Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingTop: hp("6%"),
    paddingBottom: hp("2%"),
    paddingHorizontal: wp("4%"),
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#FE3C72",
  },
  backButtonText: {
    fontSize: wp("4.5%"),
    color: "#fff",
    fontWeight: "bold",
  },
  headerTitle: {
    flex: 1,
    fontSize: wp("5.5%"),
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginRight: wp("10%"),
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: wp("6%"),
    paddingBottom: hp("4%"),
    backgroundColor: "#fff",
  },
  sectionTitle: {
    fontSize: wp("5%"),
    fontWeight: "bold",
    color: "#333",
    marginBottom: hp("1%"),
  },
  inputGroup: {
    marginBottom: hp("2.5%"),
  },
  label: {
    fontSize: wp("4%"),
    fontWeight: "600",
    marginBottom: hp("1%"),
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 15,
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.5%"),
    fontSize: wp("4%"),
    backgroundColor: "#fafafa",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 15,
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.5%"),
    backgroundColor: "#fafafa",
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 15,
    backgroundColor: "#fafafa",
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 15,
    padding: hp("2%"),
    backgroundColor: "#fafafa",
    alignItems: "center",
  },
  imagePickerText: {
    fontSize: wp("4%"),
    color: "#555",
  },
  imagePreview: {
    width: wp("30%"),
    height: wp("30%"),
    borderRadius: 15,
    marginTop: hp("2%"),
    alignSelf: "center",
  },
  submitButton: {
    backgroundColor: "#FE3C72",
    paddingVertical: hp("2%"),
    borderRadius: 30,
    alignItems: "center",
    marginTop: hp("3%"),
    shadowColor: "#FE3C72",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: wp("5%"),
    fontWeight: "600",
  },
});
