import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

// Dữ liệu mẫu (giả lập danh sách người dùng)
const userData = [
  { id: "1", username: "user1", email: "user1@example.com", status: "Active" },
  { id: "2", username: "user2", email: "user2@example.com", status: "Blocked" },
  { id: "3", username: "user3", email: "user3@example.com", status: "Active" },
];

// Dữ liệu mẫu (giả lập danh sách báo cáo)
const reportData = [
  {
    id: "1",
    reporter: "user1",
    reportedUser: "user2",
    reason: "Ảnh không phù hợp trên hồ sơ",
    status: "Pending",
  },
  {
    id: "2",
    reporter: "user3",
    reportedUser: "user2",
    reason: "Tiểu sử có nội dung xúc phạm",
    status: "Pending",
  },
  {
    id: "3",
    reporter: "user1",
    reportedUser: "user3",
    reason: "Hành vi quấy rối qua tin nhắn",
    status: "Resolved",
  },
];

export default function AdminPanelScreen() {
  const navigation = useNavigation();
  const [users, setUsers] = useState(userData);
  const [reports, setReports] = useState(reportData);

  // Hàm chặn người dùng
  const handleBlockUser = (userId) => {
    Alert.alert(
      "Chặn người dùng",
      "Bạn có chắc chắn muốn chặn người dùng này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Chặn",
          style: "destructive",
          onPress: () => {
            setUsers(
              users.map((user) =>
                user.id === userId ? { ...user, status: "Blocked" } : user
              )
            );
            Alert.alert("Thông báo", "Người dùng đã bị chặn.");
          },
        },
      ]
    );
  };

  // Hàm xóa tài khoản
  const handleDeleteUser = (userId) => {
    Alert.alert(
      "Xóa tài khoản",
      "Bạn có chắc chắn muốn xóa tài khoản này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            setUsers(users.filter((user) => user.id !== userId));
            Alert.alert("Thông báo", "Tài khoản đã được xóa.");
          },
        },
      ]
    );
  };

  // Hàm gửi thông báo
  const handleSendNotification = () => {
    Alert.alert("Thông báo", "Gửi thông báo đến tất cả người dùng (placeholder).");
  };

  // Hàm chặn người dùng từ báo cáo
  const handleBlockReportedUser = (reportId, reportedUserId) => {
    Alert.alert(
      "Chặn người dùng",
      "Bạn có chắc chắn muốn chặn người dùng này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Chặn",
          style: "destructive",
          onPress: () => {
            setUsers(
              users.map((user) =>
                user.id === reportedUserId ? { ...user, status: "Blocked" } : user
              )
            );
            setReports(
              reports.map((report) =>
                report.id === reportId ? { ...report, status: "Resolved" } : report
              )
            );
            Alert.alert("Thông báo", "Người dùng đã bị chặn và báo cáo đã được giải quyết.");
          },
        },
      ]
    );
  };

  // Hàm xóa báo cáo
  const handleDeleteReport = (reportId) => {
    Alert.alert(
      "Xóa báo cáo",
      "Bạn có chắc chắn muốn đánh dấu báo cáo này là đã giải quyết?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            setReports(
              reports.map((report) =>
                report.id === reportId ? { ...report, status: "Resolved" } : report
              )
            );
            Alert.alert("Thông báo", "Báo cáo đã được đánh dấu là đã giải quyết.");
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => navigation.navigate("Welcome")}
        >
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Thống kê */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>Tổng người dùng: {users.length}</Text>
        <Text style={styles.statsText}>
          Người dùng hoạt động: {users.filter((u) => u.status === "Active").length}
        </Text>
        <Text style={styles.statsText}>
          Báo cáo chưa giải quyết: {reports.filter((r) => r.status === "Pending").length}
        </Text>
      </View>

      {/* Nút gửi thông báo */}
      <TouchableOpacity
        style={styles.notificationButton}
        onPress={handleSendNotification}
      >
        <Text style={styles.notificationButtonText}>Gửi thông báo</Text>
      </TouchableOpacity>

      {/* Danh sách người dùng */}
      <Text style={styles.sectionTitle}>Danh sách người dùng</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.userItem}>
            <View>
              <Text style={styles.userText}>Username: {item.username}</Text>
              <Text style={styles.userText}>Email: {item.email}</Text>
              <Text style={styles.userText}>Trạng thái: {item.status}</Text>
            </View>
            <View style={styles.userActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleBlockUser(item.id)}
                disabled={item.status === "Blocked"}
              >
                <Text style={styles.actionButtonText}>Chặn</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#FF3B30" }]}
                onPress={() => handleDeleteUser(item.id)}
              >
                <Text style={styles.actionButtonText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        style={styles.list}
      />

      {/* Danh sách báo cáo */}
      <Text style={styles.sectionTitle}>Danh sách báo cáo</Text>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.reportItem}>
            <View>
              <Text style={styles.reportText}>Người báo cáo: {item.reporter}</Text>
              <Text style={styles.reportText}>Người bị báo cáo: {item.reportedUser}</Text>
              <Text style={styles.reportText}>Lý do: {item.reason}</Text>
              <Text style={styles.reportText}>Trạng thái: {item.status}</Text>
            </View>
            <View style={styles.reportActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleBlockReportedUser(item.id, item.reportedUser)}
                disabled={item.status === "Resolved"}
              >
                <Text style={styles.actionButtonText}>Chặn</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#FF3B30" }]}
                onPress={() => handleDeleteReport(item.id)}
                disabled={item.status === "Resolved"}
              >
                <Text style={styles.actionButtonText}>Xóa báo cáo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        style={styles.list}
      />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FE3C72",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FE3C72",
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  notificationButton: {
    backgroundColor: "#FE3C72",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 16,
  },
  notificationButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  list: {
    marginBottom: 20,
  },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  userText: {
    fontSize: 14,
    color: "#1F2937",
    marginBottom: 4,
  },
  userActions: {
    flexDirection: "row",
  },
  reportItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  reportText: {
    fontSize: 14,
    color: "#1F2937",
    marginBottom: 4,
  },
  reportActions: {
    flexDirection: "row",
  },
  actionButton: {
    backgroundColor: "#FE3C72",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});