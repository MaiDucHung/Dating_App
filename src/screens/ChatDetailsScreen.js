import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Image,
  TouchableOpacity,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import {
  ChevronLeftIcon,
  FaceSmileIcon,
  PaperAirplaneIcon,
  PhotoIcon,
} from "react-native-heroicons/outline";
import { EllipsisHorizontalIcon } from "react-native-heroicons/solid";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import io from "socket.io-client";
import { BASE_URL } from "../../config";
import EmojiSelector from "react-native-emoji-selector";

const android = Platform.OS === "android";

export default function ChatDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { chatId, imgUrl, name, age, userId: otherUserId } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [emojiVisible, setEmojiVisible] = useState(false);
  const socket = useRef(null);
  const flatListRef = useRef(null);
  const [myUserId, setMyUserId] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const userId = await AsyncStorage.getItem("userId");
      setMyUserId(userId);
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    fetchMessages();
    initializeSocket();

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [chatId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setError("No authentication token found!");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/chats/${chatId}/messages`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      console.log("Messages fetched from API:", result);

      if (response.ok) {
        setMessages(result);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        setError(result.message || "Failed to fetch messages!");
      }
    } catch (err) {
      setError("Unable to connect to the server!");
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

 const sendMessage = () => {
  if (newMessage.trim() && socket.current) {
    const timestamp = new Date().toISOString();
    const messageData = { chatId, text: newMessage, timestamp };

    try {
      socket.current.emit("sendMessage", messageData, (response) => {
        if (response && response.error) {
          console.error("Error sending message:", response.error);
          Alert.alert("Error", response.error);
        } else {
          console.log("Message sent successfully:", response);
          // Thêm tin nhắn vào state chỉ khi server xác nhận
          const formattedMessage = {
            id: response.messageId, // Giả sử server trả về messageId
            chatId: chatId.toString(),
            sender: "me",
            text: newMessage,
            timestamp,
          };
          setMessages((prev) => [...prev, formattedMessage].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      });
    } catch (err) {
      console.error("Error sending message:", err);
      Alert.alert("Error", "Failed to send message!");
    }

    setNewMessage("");
  } else {
    Alert.alert("Error", "Please enter a message to send!");
  }
};

const initializeSocket = async () => {
  const token = await AsyncStorage.getItem("token");
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
    console.log("Connected to Socket.IO in ChatDetails");
    socket.current.emit("joinRoom", chatId);
    if (myUserId) {
      socket.current.emit("join", myUserId);
      console.log(`Joined room with userId: ${myUserId}`);
    }
  });

  socket.current.on("newMessage", (message) => {
    console.log("Received new message:", message);

    if (message.chatId === chatId && message.senderId?.toString() !== myUserId?.toString()) {
      const formattedMessage = {
        ...message,
        sender: "me",
      };
      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === formattedMessage.id);
        if (!exists) {
          return [...prev, formattedMessage].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
        return prev;
      });
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  });

  socket.current.on("messageRecalled", (data) => {
    if (data.chatId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, recalled: true } : msg
        )
      );
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  });

  socket.current.on("connect_error", (err) => {
    console.error("Socket.IO connection error:", err.message);
    setError("Failed to connect to real-time chat service: " + err.message);
  });

  socket.current.on("error", (err) => {
    console.error("Socket.IO error:", err);
    setError(err.message || "An error occurred with the chat service");
  });
};
  const onEmojiSelected = (emoji) => {
    setNewMessage((prev) => prev + emoji);
    setEmojiVisible(false); // Đóng modal sau khi chọn
  };

  const recallMessage = async (messageId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No authentication token found!");
        return;
      }

      console.log("Sending recall request for messageId:", messageId);
      const response = await fetch(`${BASE_URL}/api/chats/${messageId}/recall`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      console.log("Recall response:", result);
      if (response.ok) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === parseInt(messageId) ? { ...msg, recalled: true } : msg))
        );
        Alert.alert("Success", "Message recalled successfully!");
      } else {
        Alert.alert("Error", result.message || "Failed to recall message!");
      }
    } catch (error) {
      console.error("Error recalling message:", error);
      Alert.alert("Error", "Unable to connect to the server!");
    }
  };

  const handleBlockUser = async () => {
    Alert.alert(
      "🚫 Confirm Block",
      "Are you sure you want to block this user? They won't be able to message or interact with you anymore.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes, Block",
          style: "destructive",
          onPress: async () => {
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
          },
        },
      ]
    );
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

  const renderMessage = ({ item, index }) => {
    if (!item || !item.timestamp) {
      return <Text style={styles.errorText}>Invalid message data</Text>;
    }

    const currentTime = new Date(item.timestamp);
    const prevMessage = messages[index - 1];
    const prevTime = prevMessage ? new Date(prevMessage.timestamp) : null;
    const timeDiff = prevTime ? (currentTime - prevTime) / (1000 * 60) : 30;
    const showTimeSeparator = !prevTime || timeDiff >= 30;

    const isMe = item.sender === "me";

    return (
      <View>
        {showTimeSeparator && (
          <Text style={styles.timeSeparator}>
            {currentTime.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            {" "}
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}
        <View style={[styles.messageRow, { flexDirection: isMe ? "row-reverse" : "row" }]}>
          <View style={styles.messageBubbleContainer}>
            <View
              style={[
                styles.messageBubble,
                {
                  borderBottomRightRadius: isMe ? 0 : 8,
                  borderBottomLeftRadius: isMe ? 8 : 0,
                  backgroundColor: isMe ? "#34C759" : "#FF69B4",
                },
              ]}
            >
              {item.recalled ? (
                <Text style={styles.messageText}>Message recalled</Text>
              ) : (
                <Text style={styles.messageText}>{item.text || item.message}</Text>
              )}
              {isMe && !item.recalled && item.id && (
                <TouchableOpacity style={styles.recallButton} onPress={() => recallMessage(item.id)}>
                  <Text style={styles.recallText}>Recall</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.messageStatus}>
              {isMe ? "Sent " : ""}
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </View>
      </View>
    );
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
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMessages}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: android ? hp(4) : 0 }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.headerLeft} onPress={() => navigation.navigate("Chat")}>
          <ChevronLeftIcon size={hp(2.5)} color="#000" strokeWidth={2} />
          <TouchableOpacity
            onPress={() => {
              console.log("Navigating to UserProfile with userId:", otherUserId);
              navigation.navigate("UserProfile", { userId: otherUserId });
            }}
          >
            <View style={styles.avatarContainer}>
              <Image source={{ uri: imgUrl }} style={styles.avatar} />
            </View>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{name}, {age}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.moreButton} onPress={() => setMenuVisible(true)}>
            <EllipsisHorizontalIcon size={hp(3)} color="#000" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Details */}
      <View style={styles.chatContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={styles.chatList}
          renderItem={renderMessage}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      </View>

      {/* Text Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Write your message here"
            placeholderTextColor="#6B7280"
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <View style={styles.inputIcons}>
            <TouchableOpacity onPress={() => setEmojiVisible(true)}>
              <FaceSmileIcon size={hp(2.5)} color="#6B7280" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <PaperAirplaneIcon color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal Emoji */}
      <Modal
        transparent={true}
        visible={emojiVisible}
        animationType="slide"
        onRequestClose={() => setEmojiVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay_1} onPress={() => setEmojiVisible(false)}>
          <View style={styles.emojiContainer}>
            <EmojiSelector
              onEmojiSelected={onEmojiSelected}
              showHistory={true}
              showSectionTitles={true}
              columns={8}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setEmojiVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Menu Modal */}
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

      {/* Report Modal */}
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
              onPress={() => handleReportUser("Harassment or Abuse")}
            >
              <Text style={styles.modalText}>Harassment or Abuse</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleReportUser("Pornographic or Inappropriate Content")}
            >
              <Text style={styles.modalText}>Pornographic or Inappropriate Content</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleReportUser("Fake Profile")}>
              <Text style={styles.modalText}>Fake Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleReportUser("Scam or Suspicious Behavior")}
            >
              <Text style={styles.modalText}>Scam or Suspicious Behavior</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
    fontSize: 18,
    marginBottom: 10,
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
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    borderWidth: 2,
    borderColor: "#F87171",
    borderRadius: 999,
    marginRight: 8,
    marginLeft: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: 999,
  },
  userInfo: {
    justifyContent: "center",
    alignItems: "flex-start",
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  moreButton: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 999,
    padding: 6,
  },
  chatContainer: {
    flex: 1,
    width: "100%",
  },
  chatList: {
    paddingBottom: hp(15),
  },
  messageRow: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  messageBubbleContainer: {
    width: "auto",
    maxWidth: "70%",
  },
  messageBubble: {
    padding: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 20,
  },
  messageStatus: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "right",
    marginTop: 2,
  },
  recallButton: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "#FF4444",
    borderRadius: 10,
    padding: 2,
  },
  recallText: {
    color: "#fff",
    fontSize: 10,
  },
  inputContainer: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "85%",
  },
  textInput: {
    flex: 1,
    fontSize: hp(1.7),
    fontWeight: "500",
    color: "#000",
    marginBottom: 4,
    paddingLeft: 4,
  },
  inputIcons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  sendButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 20,
    paddingVertical: 12,
    width: "13%",
    justifyContent: "center",
    alignItems: "center",
  },
    modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
     justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay_1: {
  flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

 emojiContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingBottom: 10,
    maxHeight: hp(40), // Giới hạn chiều cao
  },
  closeButton: {
    backgroundColor: "#FE3C72",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "center",
    marginTop: 8,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    width: "80%",
    maxWidth: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  timeSeparator: {
    textAlign: "center",
    fontSize: 12,
    color: "#6B7280",
    marginVertical: 10,
  },
});