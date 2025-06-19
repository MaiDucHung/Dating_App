import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MagnifyingGlassIcon, HandRaisedIcon } from "react-native-heroicons/outline";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { useNavigation, useFocusEffect } from "@react-navigation/native"; // Thêm useFocusEffect
import AsyncStorage from "@react-native-async-storage/async-storage";
import io from "socket.io-client";
import { BASE_URL } from "../../config";

const android = Platform.OS === "android";

export default function ChatScreen() {
  const navigation = useNavigation();
  const [matchesWithoutMessages, setMatchesWithoutMessages] = useState([]);
  const [chatsWithMessages, setChatsWithMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [myUserId, setMyUserId] = useState(null);
  const socket = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    const initialize = async () => {
      const userId = await AsyncStorage.getItem("userId");
      setMyUserId(userId);
      await fetchChats(); // Lấy dữ liệu ban đầu
      await initializeSocket();
    };
    initialize();

    return () => {
      if (socket.current) socket.current.disconnect();
    };
  }, []);

  // Sử dụng useFocusEffect để làm mới dữ liệu khi focus
  useFocusEffect(
    React.useCallback(() => {
      fetchChats(); // Gọi lại khi màn hình được focus
      return () => {
        // Cleanup nếu cần (ở đây không cần thiết nhưng có thể thêm logic)
      };
    }, [])
  );

  const fetchChats = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setError("No authentication token found!");
        return;
      }

      console.log("Fetching chats with token:", token);
      const response = await fetch(`${BASE_URL}/api/chats`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      console.log("Fetch chats response:", result);

      if (response.ok) {
        setMatchesWithoutMessages(
          Array.isArray(result.matchesWithoutMessages)
            ? result.matchesWithoutMessages.map((item) => ({
                ...item,
                userId: item.userId || "",
                isBlockedByOther: item.isBlockedByOther || false,
              }))
            : []
        );
        setChatsWithMessages(
          Array.isArray(result.chatsWithMessages)
            ? result.chatsWithMessages.map((item) => ({
                ...item,
                userId: item.userId || "",
                isBlockedByOther: item.isBlockedByOther || false,
              }))
            : []
        );
        flatListRef.current?.scrollToEnd({ animated: true });
      } else {
        setError(result.message || "Failed to fetch chats!");
      }
    } catch (err) {
      setError("Unable to connect to the server!");
      console.error("Error fetching chats:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeSocket = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token || !myUserId) return;

    socket.current = io(BASE_URL, {
      auth: { token },
      transports: ["websocket"],
      path: "/socket.io/",
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.current.on("connect", () => {
      console.log("Connected to Socket.IO with socket ID:", socket.current.id);
      socket.current.emit("join", myUserId);
    });

    socket.current.on("connect_error", (err) => {
      console.error("Socket.IO connection error:", err.message);
      setError(`Failed to connect: ${err.message}`);
    });

    socket.current.on("newMatch", ({ userId, match }) => {
      console.log("New match received:", { userId, match });
      if (userId === myUserId && match && !match.isBlockedByOther) {
        if (!match.hasMessages) {
          setMatchesWithoutMessages((prev) => {
            const exists = prev.find((m) => m.id === match.id);
            if (!exists) {
              return [
                ...prev,
                {
                  ...match,
                  userId: match.userId || "",
                  isBlockedByOther: match.isBlockedByOther || false,
                  imgUrl: match.imgUrl || "https://via.placeholder.com/100/FF0000/FFFFFF?text=No+Image/100",
                  name: match.name || "Unknown",
                  age: match.age || 0,
                },
              ];
            }
            return prev;
          });
          console.log("Updated matchesWithoutMessages:", matchesWithoutMessages); // Debug
        } else {
          setChatsWithMessages((prev) => {
            const exists = prev.find((c) => c.id === match.id);
            if (!exists) {
              return [
                ...prev,
                {
                  ...match,
                  userId: match.userId || "",
                  isBlockedByOther: match.isBlockedByOther || false,
                  imgUrl: match.imgUrl || "https://via.placeholder.com/100/FF0000/FFFFFF?text=No+Image/100",
                  name: match.name || "Unknown",
                  age: match.age || 0,
                },
              ];
            }
            return prev;
          });
        }
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    });

    socket.current.on("newMessage", (message) => {
      console.log("New message received:", message);
      if (message.chatId) {
        setChatsWithMessages((prevChats) =>
          prevChats.map((chat) =>
            chat.id === message.chatId
              ? { ...chat, lastMessage: message.text, timeSent: message.timestamp, senderId: message.senderId }
              : chat
          ).filter((chat) => !chat.isBlockedByOther)
        );
        setMatchesWithoutMessages((prevMatches) =>
          prevMatches.filter((match) => match.id !== message.chatId && !match.isBlockedByOther)
        );
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    });

    socket.current.on("disconnect", () => {
      console.log("Disconnected, attempting to reconnect...");
      setTimeout(() => initializeSocket(), 2000);
    });
  };

  const sendMessage = (chatId, message) => {
    if (socket.current && message.trim() && myUserId) {
      socket.current.emit("sendMessage", {
        chatId,
        text: message,
        senderId: myUserId,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const filteredMatches = matchesWithoutMessages.filter((match) =>
    match.name.toLowerCase().includes(searchQuery.toLowerCase()) && !match.isBlockedByOther
  );

  const filteredChats = chatsWithMessages.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) && !chat.isBlockedByOther
  );

  const renderMatchItem = ({ item }) => (
    <TouchableOpacity
      style={styles.matchItem}
      onPress={() =>
        navigation.navigate("ChatDetails", {
          chatId: item.id || "",
          imgUrl: item.imgUrl || "https://via.placeholder.com/100/FF0000/FFFFFF?text=No+Image/100",
          name: item.name || "Unknown",
          age: item.age || 0,
          userId: item.userId || "",
        })
      }
    >
      <View style={styles.matchAvatarContainer}>
        <Image
          source={{ uri: item.imgUrl || "https://via.placeholder.com/100/FF0000/FFFFFF?text=No+Image/100" }}
          style={styles.matchAvatar}
          onError={(e) => console.log("Match image load error:", e.nativeEvent.error)}
        />
        {item.isOnline && <View style={styles.matchOnlineIndicator} />}
      </View>
      <View style={styles.matchInfo}>
        <Text style={styles.matchName} numberOfLines={1}>
          {item.name || "Unknown"}, {item.age || "N/A"}
        </Text>
        <HandRaisedIcon size={hp(3)} color="#FE3C72" strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );

  const renderChatItem = ({ item }) => {
    const isMyMessage = item.senderId === myUserId;
    const lastMessageText = item.isBlockedByOther
      ? "You cannot see messages from a user who blocked you"
      : isMyMessage
      ? `You: ${item.lastMessage || "You have blocked"}`
      : item.lastMessage && item.lastMessage.length > 40
      ? item.lastMessage.slice(0, 30) + "..."
      : item.lastMessage || "You have blocked";

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate("ChatDetails", {
            chatId: item.id || "",
            imgUrl: item.imgUrl || "https://via.placeholder.com/100/FF0000/FFFFFF?text=No+Image/100",
            name: item.name || "Unknown",
            age: item.age || 0,
            userId: item.userId || "",
          })
        }
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: item.imgUrl || "https://via.placeholder.com/100/FF0000/FFFFFF?text=No+Image/100" }}
            style={[
              styles.avatar,
              {
                borderWidth: item.isOnline ? 2 : 0,
                borderColor: item.isOnline ? "#34C759" : "transparent",
              },
            ]}
            onError={(e) => console.log("Chat image load error:", e.nativeEvent.error)}
          />
          {item.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatInfoHeader}>
            <Text style={styles.chatName}>{item.name || "Unknown"}</Text>
            <Text style={styles.chatTime}>{formatTime(item.timeSent)}</Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1} ellipsizeMode="tail">
            {lastMessageText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FE3C72" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchChats}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { paddingTop: android ? hp(3) : 0 },
      ]}
    >
      {/* Matches Section */}
      <View style={styles.matchesSection}>
        <Text style={styles.sectionTitle}>List Match</Text>
        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => `match-${item.id.toString()}`}
          extraData={matchesWithoutMessages} // Ép re-render
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.matchesList}
          renderItem={renderMatchItem}
          ListEmptyComponent={<Text style={styles.emptyText}>No matches found.</Text>}
        />
      </View>
      <Text style={styles.sectionTitle}>Messages</Text>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MagnifyingGlassIcon size={hp(2.2)} color="gray" strokeWidth={2} />
        <TextInput
          placeholder="Search"
          placeholderTextColor="gray"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Chat List */}
      {chatsWithMessages.length > 0 && (
        <View style={styles.chatListContainer}>
          <FlatList
            ref={flatListRef}
            data={filteredChats}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={renderChatItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No messages found.</Text>}
          />
        </View>
      )}

      {matchesWithoutMessages.length === 0 && chatsWithMessages.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No matches or messages found.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
    alignSelf: "center",
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FE3C72",
    borderRadius: 25,
  },
  retryText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  matchesSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#FE3C72",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FE3C72",
    marginBottom: 16,
    textAlign: "center",
    textTransform: "uppercase",
  },
  matchesList: {
    paddingVertical: 2,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  matchItem: {
    alignItems: "center",
    marginRight: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    shadowColor: "#FE3C72",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#FFE4E6",
  },
  matchAvatarContainer: {
    position: "relative",
  },
  matchAvatar: {
    width: hp(10),
    height: hp(10),
    borderRadius: 999,
    borderWidth: 4,
    borderColor: "#FE3C72",
  },
  matchOnlineIndicator: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    backgroundColor: "#34C759",
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "#fff",
  },
  matchInfo: {
    marginTop: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  matchName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
    maxWidth: hp(10),
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#FE3C72",
  },
  searchInput: {
    flex: 1,
    fontSize: hp(2),
    paddingLeft: 12,
    paddingVertical: 0,
    color: "#1F2937",
  },
  chatListContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: hp(7),
    height: hp(7),
    borderRadius: 999,
    resizeMode: "cover",
    borderWidth: 2,
    borderColor: "#FE3C72",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: "#34C759",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#fff",
  },
  chatInfo: {
    flex: 1,
  },
  chatInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  chatTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  lastMessage: {
    fontSize: 14,
    color: "#4B5563",
  },
});