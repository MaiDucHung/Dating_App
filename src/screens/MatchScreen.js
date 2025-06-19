import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  Alert,
  TextInput,
  ScrollView,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { ArrowLeftIcon, CogIcon } from "react-native-heroicons/outline";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../config";

export default function MatchScreen() {
  const navigation = useNavigation();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [position] = useState(new Animated.ValueXY({ x: 0, y: 0 }));
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
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
  const [preferences, setPreferences] = useState({
    min_age: 18,
    max_age: 100,
    max_distance: 0,
    min_height: 0,
    max_height: 290,
    preferred_city: "",
    preferred_looking_for: null,
  });
  const [isPreferencesLoaded, setIsPreferencesLoaded] = useState(false);
  const [ageNotImportant, setAgeNotImportant] = useState(false);
  const [heightNotImportant, setHeightNotImportant] = useState(false);
  const [lookingForNotImportant, setLookingForNotImportant] = useState(false);
  const [cityNotImportant, setCityNotImportant] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.warn("No token found");
          return;
        }

        const response = await fetch(`${BASE_URL}/api/preferences`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (response.ok) {
          setPreferences({
            min_age: Number(result.min_age) || 18,
            max_age: Number(result.max_age) || 100,
            max_distance: Number(result.max_distance) || 0,
            min_height: Number(result.min_height) || 0,
            max_height: Number(result.max_height) || 290,
            preferred_city: result.preferred_city || "",
            preferred_looking_for: result.preferred_looking_for || null,
          });
          setAgeNotImportant(result.min_age === 18 && result.max_age === 100);
          setHeightNotImportant(result.min_height === 0 && result.max_height === 290);
          setLookingForNotImportant(!result.preferred_looking_for);
          setCityNotImportant(!result.preferred_city);
          setCityInput(result.preferred_city || "");
          setIsPreferencesLoaded(true);
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
      }
    };
    fetchPreferences();
  }, []);

  useEffect(() => {
    if (isPreferencesLoaded) {
      fetchProfiles();
    }
  }, [isPreferencesLoaded]);

  useEffect(() => {
    if (currentIndex >= profiles.length) {
      setProfiles([]);
      setCurrentIndex(0);
      setCurrentPhotoIndex(0);
    }
  }, [currentIndex, profiles.length]);

  const fetchProfiles = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/profiles/discover`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (response.ok) {
        const profilesWithPhotos = result
          .filter(
            (profile) =>
              profile &&
              profile.photos &&
              Array.isArray(profile.photos) &&
              profile.photos.length > 0 &&
              profile.photos.some((photo) => photo.imgUrl)
          )
          .filter((profile) => {
            const age = Number(profile.age) || 0;
            const height = Number(profile.height) || 0;
            const cityMatch = cityNotImportant || !preferences.preferred_city || profile.city === preferences.preferred_city;
            const lookingForMatch = lookingForNotImportant || !preferences.preferred_looking_for || profile.looking_for === preferences.preferred_looking_for;
            return (
              (ageNotImportant || (age >= (Number(preferences.min_age) || 18) && age <= (Number(preferences.max_age) || 100))) &&
              (heightNotImportant || (height >= (Number(preferences.min_height) || 0) && height <= (Number(preferences.max_height) || 290))) &&
              cityMatch &&
              lookingForMatch
            );
          });
        setProfiles(profilesWithPhotos);
      } else {
        Alert.alert("Error", result.message || "Failed to fetch profiles!");
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
      Alert.alert("Error", "Unable to connect to the server!");
    }
  };

  const handleSwipeLeft = async () => {
    if (currentIndex < profiles.length) {
      const dislikedProfile = profiles[currentIndex];
      await sendMatchData(dislikedProfile.id, "dislike1");
      Animated.timing(position, {
        toValue: { x: -Dimensions.get("window").width, y: 0 },
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setCurrentIndex(currentIndex + 1);
        setCurrentPhotoIndex(0);
        position.setValue({ x: 0, y: 0 });
      });
    }
  };

  const handleSwipeRight = async () => {
    if (currentIndex < profiles.length) {
      const matchedProfile = profiles[currentIndex];
      await sendMatchData(matchedProfile.id, "pending");
      await notifyLike(matchedProfile.id);
      Animated.timing(position, {
        toValue: { x: Dimensions.get("window").width, y: 0 },
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setCurrentIndex(currentIndex + 1);
        setCurrentPhotoIndex(0);
        position.setValue({ x: 0, y: 0 });
      });
    }
  };

  const sendMatchData = async (user2Id, status) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/profiles/match`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user2Id, status }),
      });

      const result = await response.json();
      if (response.ok) {
        console.log(`${status === "dislike1" ? "Dislike" : "Match"} recorded successfully:`, result);
        if (result.status === "accepted") {
          Alert.alert("Success", "You have a new match!");
        }
      } else {
        Alert.alert("Error", result.message || `Failed to record ${status === "dislike1" ? "dislike" : "match"}!`);
      }
    } catch (error) {
      console.error(`Error recording ${status === "dislike1" ? "dislike" : "match"}:`, error);
      Alert.alert("Error", "Unable to connect to the server!");
    }
  };

  const notifyLike = async (user2Id) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      const payload = { user2Id, message: "Someone liked you" };
      const response = await fetch(`${BASE_URL}/api/notifications/notify-like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error("Failed to notify like:", result.message || "Unknown error");
      }
    } catch (error) {
      console.error("Error notifying like:", error.message);
    }
  };

  const savePreferences = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      if (!ageNotImportant && preferences.min_age > preferences.max_age) {
        Alert.alert("Error", "Minimum age cannot be greater than maximum age!");
        return;
      }
      if (!heightNotImportant && preferences.min_height > preferences.max_height) {
        Alert.alert("Error", "Minimum height cannot be greater than maximum height!");
        return;
      }
      if (!cityNotImportant && preferences.preferred_city && !cityItems.some(city => city.value === preferences.preferred_city)) {
        Alert.alert("Error", "Please select a valid city from the suggestions!");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/preferences`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          min_age: ageNotImportant ? 18 : preferences.min_age,
          max_age: ageNotImportant ? 100 : preferences.max_age,
          max_distance: preferences.max_distance,
          min_height: heightNotImportant ? 0 : preferences.min_height,
          max_height: heightNotImportant ? 290 : preferences.max_height,
          preferred_city: cityNotImportant ? null : preferences.preferred_city,
          preferred_looking_for: lookingForNotImportant ? null : preferences.preferred_looking_for,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        Alert.alert("Success", "Preferences updated successfully!");
        setSettingsModalVisible(false);
        fetchProfiles();
      } else {
        Alert.alert("Error", result.message || "Failed to update preferences!");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      Alert.alert("Error", "Unable to connect to the server!");
    }
  };

  const handleCityInputChange = (text) => {
    setCityInput(text);

    if (!text.trim()) {
      setCitySuggestions([]);
      setPreferences((prev) => ({ ...prev, preferred_city: "" }));
    } else {
      const filteredCities = cityItems
        .filter((city) =>
          city.value.toLowerCase().includes(text.toLowerCase())
        )
        .slice(0, 4);

      setCitySuggestions(filteredCities);
    }
  };

  const selectCity = (cityValue) => {
    setCityInput(cityValue);
    setPreferences((prev) => ({ ...prev, preferred_city: cityValue }));
    setCitySuggestions([]);
  };

  const renderPhoto = ({ item }) => (
    <Image
      source={{ uri: item.imgUrl || "https://via.placeholder.com/100/FF0000/FFFFFF?text=No+Image/300" }}
      style={styles.profileImage}
      onError={(e) => console.log("Image load error:", e.nativeEvent.error)}
    />
  );

  const toggleLookingFor = (value) => {
    if (lookingForNotImportant) setLookingForNotImportant(false);
    setPreferences((prev) => ({
      ...prev,
      preferred_looking_for: prev.preferred_looking_for === value ? null : value,
    }));
  };

  const currentProfile = profiles[currentIndex];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeftIcon size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={styles.iconBtnPink}>
          <CogIcon size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      {profiles.length > 0 && currentProfile ? (
        <Animated.View style={[styles.card, { transform: [{ translateX: position.x }] }]}>
          <ScrollView contentContainerStyle={styles.cardContent}>
            <View style={styles.imageContainer}>
              <FlatList
                data={currentProfile.photos}
                renderItem={renderPhoto}
                keyExtractor={(item, index) => index.toString()} // Sử dụng index làm key vì không có id duy nhất
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={currentProfile.photos.findIndex((photo) => photo.is_primary)}
                getItemLayout={(data, index) => ({
                  length: wp(96),
                  offset: wp(96) * index,
                  index,
                })}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / wp(96));
                  setCurrentPhotoIndex(index);
                }}
              />
              <View style={styles.photoIndicatorContainer}>
                {currentProfile.photos.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.photoIndicator,
                      currentPhotoIndex === i && styles.photoIndicatorActive,
                    ]}
                  />
                ))}
              </View>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.name}>
                {currentProfile.username || "Unknown"}, {currentProfile.age || "N/A"}
              </Text>
              <Text style={styles.subText}>{currentProfile.city || "Unknown City"}</Text>
              <Text style={styles.bio}>{currentProfile.bio || "No bio available"}</Text>
              <View style={styles.tagsContainer}>
                {currentProfile.hobbies?.length > 0 ? (
                  currentProfile.hobbies.map((hobby, i) => (
                    <Text key={i} style={styles.tag}>
                      {hobby}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.tag}>No hobbies listed</Text>
                )}
              </View>
              <View style={styles.additionalInfo}>
                <Text style={styles.additionalInfoText}>
                  Height: {currentProfile.height ? `${currentProfile.height} cm` : "Not specified"}
                </Text>
                <Text style={styles.additionalInfoText}>
                  Relationship Status: {currentProfile.relationship_status || "Not specified"}
                </Text>
                <Text style={styles.additionalInfoText}>
                  Looking For: {currentProfile.looking_for || "Not specified"}
                </Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      ) : (
        <View style={styles.noProfilesContainer}>
          <Text style={styles.noProfilesText}>No more profiles</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      {profiles.length > 0 && currentProfile && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.unmatchButton} onPress={handleSwipeLeft}>
            <Text style={styles.buttonText}>Dislike</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.matchButton} onPress={handleSwipeRight}>
            <Text style={styles.buttonText}>Like</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Preferences</Text>
            <ScrollView style={styles.modalScroll}>
              {/* Age Preference */}
              <Text style={styles.inputLabel}>Age Range</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.inputSmall, ageNotImportant && styles.inputDisabled]}
                    placeholder="Min"
                    keyboardType="numeric"
                    value={ageNotImportant ? "" : preferences.min_age?.toString()}
                    onChangeText={(text) =>
                      !ageNotImportant && setPreferences((prev) => ({ ...prev, min_age: parseInt(text) || 0 }))
                    }
                    editable={!ageNotImportant}
                  />
                </View>
                <Text style={styles.inputSeparator}>-</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.inputSmall, ageNotImportant && styles.inputDisabled]}
                    placeholder="Max"
                    keyboardType="numeric"
                    value={ageNotImportant ? "" : preferences.max_age?.toString()}
                    onChangeText={(text) =>
                      !ageNotImportant && setPreferences((prev) => ({ ...prev, max_age: parseInt(text) || 0 }))
                    }
                    editable={!ageNotImportant}
                  />
                </View>
                <TouchableOpacity
                  style={styles.radioContainer}
                  onPress={() => {
                    setAgeNotImportant(!ageNotImportant);
                    if (!ageNotImportant) {
                      setPreferences((prev) => ({ ...prev, min_age: 0, max_age: 0 }));
                    }
                  }}
                >
                  <View style={[styles.radio, ageNotImportant && styles.radioSelected]} />
                  <Text style={styles.radioLabel}>Not Important</Text>
                </TouchableOpacity>
              </View>

              {/* Height Preference */}
              <Text style={styles.inputLabel}>Height Range (cm)</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.inputSmall, heightNotImportant && styles.inputDisabled]}
                    placeholder="Min"
                    keyboardType="numeric"
                    value={heightNotImportant ? "" : preferences.min_height?.toString()}
                    onChangeText={(text) =>
                      !heightNotImportant && setPreferences((prev) => ({ ...prev, min_height: parseInt(text) || 0 }))
                    }
                    editable={!heightNotImportant}
                  />
                </View>
                <Text style={styles.inputSeparator}>-</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.inputSmall, heightNotImportant && styles.inputDisabled]}
                    placeholder="Max"
                    keyboardType="numeric"
                    value={heightNotImportant ? "" : preferences.max_height?.toString()}
                    onChangeText={(text) =>
                      !heightNotImportant && setPreferences((prev) => ({ ...prev, max_height: parseInt(text) || 0 }))
                    }
                    editable={!heightNotImportant}
                  />
                </View>
                <TouchableOpacity
                  style={styles.radioContainer}
                  onPress={() => {
                    setHeightNotImportant(!heightNotImportant);
                    if (!heightNotImportant) {
                      setPreferences((prev) => ({ ...prev, min_height: 0, max_height: 290 }));
                    }
                  }}
                >
                  <View style={[styles.radio, heightNotImportant && styles.radioSelected]} />
                  <Text style={styles.radioLabel}>Not Important</Text>
                </TouchableOpacity>
              </View>

              {/* Preferred City */}
              <Text style={styles.inputLabel}>Preferred City</Text>
              <View>
                <TextInput
                  style={[styles.input, cityNotImportant && styles.inputDisabled]}
                  placeholder="Enter city"
                  value={cityInput}
                  onChangeText={handleCityInputChange}
                  editable={!cityNotImportant}
                />
                {citySuggestions.length > 0 && !cityNotImportant && (
                  <View style={styles.suggestionsContainer}>
                    {citySuggestions.slice(0, 4).map((city) => (
                      <TouchableOpacity
                        key={city.value}
                        style={styles.suggestionItem}
                        onPress={() => selectCity(city.value)}
                      >
                        <Text style={styles.suggestionText}>{city.value}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => {
                    setCityNotImportant(!cityNotImportant);
                    if (!cityNotImportant) {
                      setPreferences((prev) => ({ ...prev, preferred_city: "" }));
                      setCityInput("");
                      setCitySuggestions([]);
                    }
                  }}
                >
                  <View style={[styles.checkbox, cityNotImportant && styles.checkboxSelected]} />
                  <Text style={styles.checkboxLabel}>Not Important</Text>
                </TouchableOpacity>
              </View>

              {/* Looking For */}
              <Text style={styles.inputLabel}>Looking For</Text>
              <View style={styles.checkboxContainer}>
                {["friendship", "dating", "serious"].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.checkboxRow, lookingForNotImportant && styles.disabledOption]}
                    onPress={() => !lookingForNotImportant && toggleLookingFor(option)}
                    disabled={lookingForNotImportant}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        preferences.preferred_looking_for === option && styles.checkboxSelected,
                      ]}
                    />
                    <Text style={[styles.checkboxLabel, lookingForNotImportant && styles.disabledText]}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => {
                    setLookingForNotImportant(!lookingForNotImportant);
                    if (!lookingForNotImportant) {
                      setPreferences((prev) => ({ ...prev, preferred_looking_for: null }));
                    }
                  }}
                >
                  <View
                    style={[styles.checkbox, lookingForNotImportant && styles.checkboxSelected]}
                  />
                  <Text style={styles.checkboxLabel}>Not Important</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={savePreferences}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setSettingsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Thêm các style mới cho Preferred City suggestions và disabled options
  suggestionsContainer: {
    maxHeight: hp(20),
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    marginBottom: hp(1),
    paddingVertical: hp(0.5),
  },
  suggestionItem: {
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  suggestionText: {
    fontSize: hp(1.8),
    color: "#374151",
  },
  disabledOption: {
    opacity: 0.5,
  },
  disabledText: {
    color: "#6B7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: wp(90),
    maxHeight: hp(80),
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: hp(2.5),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalTitle: {
    fontSize: hp(2.8),
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: hp(2),
    textAlign: "center",
  },
  inputLabel: {
    fontSize: hp(1.8),
    fontWeight: "600",
    color: "#374151",
    marginBottom: hp(0.8),
    marginTop: hp(1.5),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp(1.5),
  },
  inputWrapper: {
    flex: 1,
    marginRight: wp(2),
  },
  inputSmall: {
    height: hp(5),
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: wp(2),
    fontSize: hp(1.8),
    backgroundColor: "#F9FAFB",
  },
  inputDisabled: {
    backgroundColor: "#E5E7EB",
    color: "#6B7280",
  },
  inputSeparator: {
    fontSize: hp(2),
    color: "#6B7280",
    marginHorizontal: wp(2),
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: wp(2),
  },
  radio: {
    width: hp(2.2),
    height: hp(2.2),
    borderRadius: hp(1.1),
    borderWidth: 2,
    borderColor: "#FE3C72",
    marginRight: wp(1.5),
  },
  radioSelected: {
    backgroundColor: "#FE3C72",
    borderColor: "#FE3C72",
  },
  radioLabel: {
    fontSize: hp(1.6),
    color: "#374151",
  },
  input: {
    width: "100%",
    height: hp(5),
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: wp(2),
    marginBottom: hp(1.5),
    fontSize: hp(1.8),
    backgroundColor: "#F9FAFB",
  },
  checkboxContainer: {
    marginBottom: hp(1.5),
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp(1),
  },
  checkbox: {
    width: hp(2.2),
    height: hp(2.2),
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#FE3C72",
    marginRight: wp(2),
  },
  checkboxSelected: {
    backgroundColor: "#FE3C72",
  },
  checkboxLabel: {
    fontSize: hp(1.8),
    color: "#374151",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: hp(2),
  },
  saveButton: {
    backgroundColor: "#FE3C72",
    padding: hp(1.5),
    borderRadius: 12,
    width: "45%",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: hp(1.8),
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
    padding: hp(1.5),
    borderRadius: 12,
    width: "45%",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#1F2937",
    fontSize: hp(1.8),
    fontWeight: "600",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: hp(2),
    backgroundColor: "#FE3C72",
  },
  iconBtn: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  iconBtnPink: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  card: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    margin: wp(2),
  },
  cardContent: {
    paddingBottom: hp(2),
  },
  imageContainer: {
    height: hp(50),
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  profileImage: {
    width: wp(96),
    height: hp(50),
    resizeMode: "cover",
  },
  photoIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    position: "absolute",
    bottom: 10,
    width: "100%",
  },
  photoIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 4,
  },
  photoIndicatorActive: {
    backgroundColor: "#fff",
  },
  infoBox: {
    padding: wp(4),
  },
  name: {
    fontSize: hp(2.5),
    fontWeight: "700",
    color: "#1F2937",
  },
  subText: {
    fontSize: hp(1.8),
    color: "#6B7280",
    marginTop: hp(0.5),
  },
  bio: {
    fontSize: hp(1.8),
    color: "#374151",
    marginTop: hp(1),
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: hp(1),
  },
  tag: {
    backgroundColor: "#FE3C72",
    color: "#fff",
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
    borderRadius: 15,
    marginRight: wp(1),
    marginBottom: hp(0.5),
    fontSize: hp(1.6),
  },
  additionalInfo: {
    marginTop: hp(1),
  },
  additionalInfoText: {
    fontSize: hp(1.6),
    color: "#6B7280",
    marginTop: hp(0.5),
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: hp(2),
  },
  unmatchButton: {
    backgroundColor: "#FF3B30",
    padding: hp(2),
    borderRadius: 50,
    width: wp(45),
    alignItems: "center",
  },
  matchButton: {
    backgroundColor: "#34C759",
    padding: hp(2),
    borderRadius: 50,
    width: wp(45),
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: hp(2),
    fontWeight: "600",
  },
  noProfilesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noProfilesText: {
    fontSize: hp(2.5),
    color: "#6B7280",
    textAlign: "center",
  },
  backButton: {
    marginTop: hp(2),
    padding: hp(1.5),
    backgroundColor: "#FE3C72",
    borderRadius: 25,
  },
  backButtonText: {
    color: "#fff",
    fontSize: hp(2),
    fontWeight: "600",
  },
});