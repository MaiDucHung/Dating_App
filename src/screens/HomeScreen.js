import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { BellIcon, HeartIcon } from "react-native-heroicons/outline";
import Ionicons from "@expo/vector-icons/Ionicons";
import { profile1 } from "../../assets/images";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import io from "socket.io-client";
import { BASE_URL } from "../../config";

const isAndroid = Platform.OS === "android";
const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const navigation = useNavigation();
  const [featuredProfile, setFeaturedProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const socket = useRef(null);

  useEffect(() => {
    const initializeScreen = async () => {
      await fetchFeaturedProfile(); // Lấy hồ sơ
      await fetchNotifications();   // Lấy thông báo ngay khi đăng nhập
      initializeSocket();           // Khởi tạo Socket.IO
    };

    initializeScreen();

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  const fetchFeaturedProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log("No token found in AsyncStorage");
        setError("No authentication token found!");
        return;
      }

      console.log("Token used for discover:", token);
      const response = await fetch(`${BASE_URL}/api/profiles/discover?limit=1`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Discover API status:", response.status);
      const result = await response.json();
      console.log("Discover API response:", result);
      if (response.ok && result && result.length > 0) {
        const profile = result[0];
        console.log("Featured profile photo URL:", profile.photos[0]?.imgUrl);
        setFeaturedProfile(profile);
      } else {
        setFeaturedProfile(null);
        setError(result.message || "No matching data available!");
      }
    } catch (err) {
      setFeaturedProfile(null);
      setError("Unable to connect to the server!");
      console.error("Error fetching featured profile:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log("No token found in AsyncStorage for notifications");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/notifications`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Notifications API status:", response.status);
      const result = await response.json();
      console.log("Notifications API response:", result);
      if (response.ok) {
        setNotifications(result.map(notification => ({
          id: notification.id.toString(),
          timestamp: notification.created_at,
          message: notification.content,
          isRead: notification.is_read,
          type: notification.type,
        })));
      } else {
        console.error("Failed to fetch notifications:", result.message);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err.message);
    }
  };

  const initializeSocket = async () => {
    const token = await AsyncStorage.getItem("token");
    const currentUserId = await AsyncStorage.getItem("userId");
    socket.current = io(`${BASE_URL}`, {
      auth: { token },
      transports: ["websocket"],
      path: "/socket.io/",
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.current.on("connect", () => {
      console.log("Connected to Socket.IO in HomeScreen");
    });

    socket.current.on("newLike", ({ userId, message, timestamp }) => {
      if (userId === currentUserId) {
        console.log("Received newLike in HomeScreen:", message);
        setNotifications((prev) => [...prev, { message, timestamp, type: "match", isRead: false }]);
      }
    });

    socket.current.on("newConnection", ({ userId, message, timestamp }) => {
      if (userId === currentUserId) {
        console.log("Received newConnection in HomeScreen:", message);
        setNotifications((prev) => [...prev, { message, timestamp, type: "system", isRead: false }]);
      }
    });

    socket.current.on("connect_error", (err) => {
      console.error("Socket.IO connection error in HomeScreen:", err.message);
    });
  };

  const handleNotificationPress = async () => {
    await fetchNotifications(); // Cập nhật lại thông báo khi nhấn vào
    // Đánh dấu tất cả thông báo là đã đọc (trên client)
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true }))
    );
    setModalVisible(true); // Mở Modal
  };

  const handleCloseModal = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log("No token found in AsyncStorage for deleting notifications");
        return;
      }

      // Gửi yêu cầu xóa thông báo đã đọc lên server (nếu backend hỗ trợ)
      const response = await fetch(`${BASE_URL}/api/notifications/clear-read`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        console.log("Cleared read notifications on server:", result);
      } else {
        console.error("Failed to clear read notifications on server:", result.message);
      }
    } catch (err) {
      console.error("Error clearing read notifications:", err.message);
    }

    // Xóa các thông báo đã đọc khỏi state
    setNotifications((prev) => prev.filter((notification) => !notification.isRead));
    setModalVisible(false); // Đóng Modal
  };

  const renderNotificationItem = ({ item }) => (
    <View style={styles.notificationItem}>
      <Text style={styles.notificationTime}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Text>
      <Text style={styles.notificationText}>{item.message}</Text>
      <Text style={styles.notificationType}>Type: {item.type}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FE3C72" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatarWrapper}>
          <Image source={profile1} style={styles.avatar} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dating App</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={handleNotificationPress}
        >
          <BellIcon size={hp(3)} strokeWidth={2} color="black" />
          {notifications.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notifications.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Notification Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => handleCloseModal()}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thông báo</Text>
            {notifications.length > 0 ? (
              <FlatList
                data={notifications}
                renderItem={renderNotificationItem}
                keyExtractor={(item) => item.id || item.timestamp}
                style={styles.notificationList}
              />
            ) : (
              <Text style={styles.noNotifications}>Không có thông báo</Text>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseModal}
            >
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.subtitle}>Find Your Match</Text>

        {/* Profile Card or No Data Message */}
        {featuredProfile ? (
          <View style={styles.cardContainer}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Match", { user: featuredProfile })}
              style={styles.card}
            >
              <Image
                source={{
                  uri: featuredProfile.photos[0]?.imgUrl || "https://via.placeholder.com/300",
                }}
                style={styles.cardImage}
                onError={(e) => console.log("Image load error:", e.nativeEvent.error)}
              />
              <View style={styles.cardInfo}>
                <View>
                  <Text style={styles.cardName}>
                    {featuredProfile.username}, {featuredProfile.age || "Unknown"}
                  </Text>
                  <Text style={styles.cardLocation}>
                    {featuredProfile.city || "Unknown City"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate("AdminPanel")}
                  style={styles.likeIconWrapper}
                >
                  <HeartIcon size={hp(6)} color="red" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>{error || "Không có dữ liệu tìm kiếm"}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchFeaturedProfile}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retryButton} onPress={() => navigation.navigate("Match", { user: featuredProfile })}>
              <Text style={styles.retryText}>Edit Preferences Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons - Always visible */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={async () => {
              const token = await AsyncStorage.getItem("token");
              console.log("Fetching pending likes with token:", token);
              try {
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
                  navigation.navigate("LikedYou", { data: result });
                } else {
                  console.error("Failed to fetch pending likes:", result.message);
                }
              } catch (err) {
                console.error("Error fetching pending likes:", err.message);
              }
            }}
          >
            <HeartIcon size={hp(2.5)} color="white" strokeWidth={2} />
            <Text style={styles.actionText}>Liked you</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={async () => {
              const token = await AsyncStorage.getItem("token");
              console.log("Fetching view again with token:", token);
              try {
                const response = await fetch(`${BASE_URL}/api/profiles/matched`, {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                });
                console.log("View again response status:", response.status);
                const result = await response.json();
                console.log("View again response result:", result);
                if (response.ok) {
                  navigation.navigate("ViewAgain", { data: result });
                } else {
                  console.error("Failed to fetch matched profiles:", result.message);
                }
              } catch (err) {
                console.error("Error fetching matched profiles:", err.message);
              }
            }}
          >
            <Ionicons name="refresh-outline" size={hp(2.5)} color="white" />
            <Text style={styles.actionText}>View the profile again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: isAndroid ? hp(2) : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  avatarWrapper: {
    borderRadius: 999,
  },
  avatar: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: 999,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  notificationButton: {
    backgroundColor: "pink",
    padding: 8,
    borderRadius: 999,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "red",
    borderRadius: 999,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  subtitle: {
    color: "#FE3C72",
    fontSize: 24,
    fontWeight: "600",
    textTransform: "capitalize",
    marginBottom: 16,
  },
  cardContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  card: {
    width: width * 0.9,
    height: hp(60),
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  cardImage: {
    width: "100%",
    height: "70%",
    resizeMode: "cover",
  },
  cardInfo: {
    padding: 16,
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  cardLocation: {
    fontSize: 16,
    color: "#666",
  },
  likeIconWrapper: {
    alignSelf: "center",
    backgroundColor: "#ffebee",
    padding: 8,
    borderRadius: 999,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FE3C72",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 4,
  },
  actionText: {
    color: "white",
    fontWeight: "600",
    fontSize: hp(2),
    marginLeft: 8,
  },

  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: hp(60),
    width: width * 0.9,
    marginBottom: 16,
  },

  noDataText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 16,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10, // nếu React Native hỗ trợ, hoặc dùng marginRight bên dưới
  },

  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FE3C72",
    borderRadius: 25,
    marginHorizontal: 5, 
  },

  retryText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: hp(50),
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FE3C72",
    marginBottom: 16,
    textAlign: "center",
  },
  notificationList: {
    flexGrow: 0,
  },
  notificationItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  notificationText: {
    fontSize: 16,
    color: "#333",
  },
  notificationTime: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  notificationType: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  notificationRead: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  noNotifications: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: "#FE3C72",
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});