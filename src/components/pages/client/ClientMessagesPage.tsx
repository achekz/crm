import React, { useEffect, useState, useRef } from "react";
import {
  Card,
  List,
  Input,
  Button,
  Avatar,
  Badge,
  Typography,
  Space,
  Spin,
  notification,
  Empty,
} from "antd";
import { SendOutlined, UserOutlined, CustomerServiceOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../../store";
import { useSocket } from "../../../hooks/useSocket";
import socketService from "../../../services/socketService";
import {
  setActiveConversation,
  fetchConversations,
  fetchMessages,
  markMessagesAsRead,
  fetchAvailableUsers,
} from "../../../store/slices/messagesSlice";
import { Message, Conversation, AvailableUser } from "../../../types/messageTypes";

const { Title, Text } = Typography;
const { TextArea } = Input;

const ClientMessagesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { conversations, activeConversation, loading, availableUsers } = useSelector(
    (state: RootState) => state.messages
  );
  const { user } = useSelector((state: RootState) => state.auth);
  const { sendMessage, markAsRead, joinConversation, isConnected } = useSocket();

  // Local state for real-time messages
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  useEffect(() => {
    dispatch(fetchConversations());
    dispatch(fetchAvailableUsers());
  }, [dispatch]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      console.log("🔄 Fetching messages for conversation:", activeConversation);

      dispatch(fetchMessages(activeConversation))
        .then((result) => {
          if (
            result.payload &&
            typeof result.payload === "object" &&
            "messages" in result.payload
          ) {
            const fetchedMessages =
              (result.payload as { messages: Message[] }).messages || [];
            console.log("📥 Got messages from API:", fetchedMessages.length, "messages");
            setConversationMessages(fetchedMessages);
          } else {
            console.log("❌ No messages in API response - setting empty array");
            setConversationMessages([]);
          }
        })
        .catch((error) => {
          console.error("❌ Error fetching messages:", error);
        });

      // Join the conversation room for real-time updates
      joinConversation(activeConversation);
    } else {
      setConversationMessages([]);
    }
  }, [activeConversation, dispatch, joinConversation]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!user) return;

    const handleNewMessage = (message: Message) => {
      console.log("🔔 Real-time message received:", message);

      // Always refresh conversations to update the conversation list
      dispatch(fetchConversations());

      // Only add to local state if it's for the current active conversation
      if (message.conversationId === activeConversation) {
        console.log("✅ Adding message to current conversation");
        setConversationMessages((prev) => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some((m) => m.id === message.id);
          if (exists) {
            console.log("📝 Message already exists, skipping...");
            return prev;
          }

          // Check if this is replacing a temporary/optimistic message
          const tempMessageExists = prev.some(
            (m) =>
              m.content === message.content && m.id && m.id.startsWith("temp_")
          );

          if (tempMessageExists) {
            // Replace temporary message with real one
            console.log("🔄 Replacing temporary message with real one");
            const withoutTemp = prev.filter(
              (m) =>
                !(
                  m.content === message.content &&
                  m.id &&
                  m.id.startsWith("temp_")
                )
            );
            return [...withoutTemp, message].sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            );
          }

          console.log("➕ Adding new message to conversation");
          // Sort messages by timestamp to maintain order
          const newMessages = [...prev, message].sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          console.log("📈 New messages count:", newMessages.length);
          return newMessages;
        });
      }
    };

    // Use the already imported socketService
    socketService.onNewMessage(handleNewMessage);
    socketService.onMessageSent(({ message }: { message: Message }) => {
      console.log("✅ Message sent confirmation received:", message);
      handleNewMessage(message);
    });

    return () => {
      // Cleanup listeners
      socketService.off("message:new");
      socketService.off("message:sent");
    };
  }, [activeConversation, user, dispatch]);

  // Mark messages as read when conversation becomes active
  useEffect(() => {
    if (activeConversation) {
      markAsRead({ conversationId: activeConversation });
      dispatch(markMessagesAsRead({ conversationId: activeConversation }));
    }
  }, [activeConversation, markAsRead, dispatch]);

  // Find active conversation or create one with admin if needed
  let activeConversationData = conversations.find(
    (conv: Conversation) => conv.conversationId === activeConversation
  );

  // If no conversation found but we have an active conversation ID,
  // create a temporary conversation object for new conversations with admin
  if (!activeConversationData && activeConversation) {
    const conversationParts = activeConversation.split("_");
    const otherUserId = conversationParts.find((id) => id !== user?.id);
    const adminUser = availableUsers.find((u) => u.id === otherUserId && u.role === "admin");

    if (adminUser) {
      activeConversationData = {
        conversationId: activeConversation,
        otherUser: adminUser,
        lastMessage: undefined,
        unreadCount: 0,
        messages: [],
      };
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    if (!activeConversationData) return;

    try {
      const messageContent = newMessage.trim();
      setNewMessage("");

      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp_${Date.now()}`,
        senderId: {
          id: user?.id || "",
          name: user?.name || "",
          email: user?.email || "",
          role: user?.role || "client",
        },
        receiverId: {
          id: activeConversationData.otherUser.id,
          name: activeConversationData.otherUser.name,
          email: activeConversationData.otherUser.email,
          role: activeConversationData.otherUser.role,
        },
        conversationId: activeConversation,
        content: messageContent,
        messageType: "text",
        timestamp: new Date().toISOString(),
        read: false,
      };

      // Add optimistic message immediately
      setConversationMessages((prev) => {
        const newMessages = [...prev, optimisticMessage].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        return newMessages;
      });

      // Send the message via socket
      console.log("🚀 Sending message via socket to:", activeConversationData.otherUser.id);
      await sendMessage({
        receiverId: activeConversationData.otherUser.id,
        content: messageContent,
        messageType: "text",
      });
      console.log("✅ Message sent successfully");

      // Refresh conversations to update the last message
      dispatch(fetchConversations());
    } catch (err) {
      console.error("Error sending message:", err);

      // Remove optimistic message on error
      setConversationMessages((prev) =>
        prev.filter((msg) => !(msg.id && msg.id.startsWith("temp_")))
      );

      notification.error({
        message: "Erreur",
        description: "Impossible d'envoyer le message",
        placement: "topRight",
      });
    }
  };

  const handleStartConversationWithAdmin = async () => {
    try {
      // Find an admin user to start conversation with
      const adminUser = availableUsers.find((u) => u.role === "admin");
      if (!adminUser) {
        notification.error({
          message: "Erreur",
          description: "Aucun administrateur disponible",
          placement: "topRight",
        });
        return;
      }

      // Create a conversation ID based on client and admin IDs (sorted for consistency)
      const ids = [user?.id, adminUser.id].sort();
      const conversationId = `${ids[0]}_${ids[1]}`;
      dispatch(setActiveConversation(conversationId));

      // Join the conversation room for real-time messaging
      joinConversation(conversationId);

      // Fetch any existing messages for this conversation
      dispatch(fetchMessages(conversationId));
    } catch (err) {
      console.error("Error starting conversation:", err);
      notification.error({
        message: "Erreur",
        description: "Impossible de démarrer la conversation",
        placement: "topRight",
      });
    }
  };

  return (
    <div className="messages-page">
      <div className="page-header">
        <Title level={2}>Messages</Title>
        <Text type="secondary">
          Communiquez avec notre équipe de support
          {!isConnected() && <Text type="danger"> • Hors ligne</Text>}
        </Text>
      </div>

      <div className="messages-container" style={{ display: "flex", gap: "16px", height: "600px" }}>
        {/* Conversations List */}
        <Card
          className="conversations-list"
          title="Conversations"
          loading={loading}
          bodyStyle={{ padding: 0 }}
          style={{ width: "350px", height: "100%" }}
        >
          {conversations.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <Empty
                image={<CustomerServiceOutlined style={{ fontSize: "48px", color: "#d9d9d9" }} />}
                description={
                  <div>
                    <Text type="secondary">Aucune conversation active</Text>
                    <br />
                    <Button
                      type="primary"
                      onClick={handleStartConversationWithAdmin}
                      style={{ marginTop: "16px" }}
                      icon={<CustomerServiceOutlined />}
                    >
                      Contacter le support
                    </Button>
                  </div>
                }
              />
            </div>
          ) : (
            <List
              dataSource={conversations}
              renderItem={(conversation: Conversation) => (
                <List.Item
                  className={`conversation-item ${
                    activeConversation === conversation.conversationId ? "active" : ""
                  }`}
                  onClick={() => dispatch(setActiveConversation(conversation.conversationId))}
                  style={{
                    cursor: "pointer",
                    padding: "16px",
                    backgroundColor:
                      activeConversation === conversation.conversationId ? "#f0f8ff" : undefined,
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge count={conversation.unreadCount} size="small">
                        <Avatar
                          src={conversation.otherUser.avatar}
                          icon={<CustomerServiceOutlined />}
                          style={{ backgroundColor: "#1890ff" }}
                        />
                      </Badge>
                    }
                    title={
                      <div>
                        <span>{conversation.otherUser.name}</span>
                        <Text type="secondary" style={{ fontSize: "12px", marginLeft: "8px" }}>
                          Support
                        </Text>
                      </div>
                    }
                    description={
                      conversation.lastMessage ? (
                        <Text ellipsis style={{ width: "200px" }}>
                          {conversation.lastMessage.content}
                        </Text>
                      ) : (
                        <Text type="secondary">Aucun message</Text>
                      )
                    }
                  />
                  {conversation.lastMessage && (
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  )}
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* Chat Area */}
        <Card
          className="chat-area"
          title={
            activeConversationData ? (
              <Space>
                <Avatar
                  src={activeConversationData.otherUser.avatar}
                  icon={<CustomerServiceOutlined />}
                  style={{ backgroundColor: "#1890ff" }}
                />
                <div>
                  <div>{activeConversationData.otherUser.name}</div>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    Support - En ligne
                  </Text>
                </div>
              </Space>
            ) : (
              "Messages"
            )
          }
          bodyStyle={{
            padding: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
          style={{ flex: 1, height: "100%" }}
        >
          {activeConversationData ? (
            <>
              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  padding: "16px",
                  overflowY: "auto",
                  backgroundColor: "#fafafa",
                  maxHeight: "450px",
                }}
              >
                {loading ? (
                  <div style={{ textAlign: "center", padding: "40px" }}>
                    <Spin />
                  </div>
                ) : (
                  <>
                    {conversationMessages.map((message: Message) => (
                      <div
                        key={message.id}
                        style={{
                          marginBottom: "16px",
                          display: "flex",
                          justifyContent:
                            message.senderId.id === user?.id ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "70%",
                            padding: "12px 16px",
                            borderRadius: "18px",
                            backgroundColor:
                              message.senderId.id === user?.id ? "#1890ff" : "#ffffff",
                            color: message.senderId.id === user?.id ? "#ffffff" : "#000000",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                            border:
                              message.senderId.id !== user?.id ? "1px solid #f0f0f0" : "none",
                          }}
                        >
                          <div style={{ marginBottom: "4px" }}>{message.content}</div>
                          <div
                            style={{
                              fontSize: "11px",
                              opacity: 0.7,
                              textAlign: "right",
                            }}
                          >
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {message.senderId.id === user?.id && (
                              <span style={{ marginLeft: "4px" }}>
                                {message.read ? "✓✓" : "✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <div
                style={{
                  padding: "16px",
                  borderTop: "1px solid #f0f0f0",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-end",
                }}
              >
                <TextArea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Tapez votre message..."
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={!isConnected()}
                  style={{ flex: 1 }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || !isConnected()}
                >
                  Envoyer
                </Button>
              </div>
            </>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                flexDirection: "column",
              }}
            >
              <CustomerServiceOutlined style={{ fontSize: "64px", color: "#d9d9d9" }} />
              <Title level={4} type="secondary" style={{ marginTop: "16px" }}>
                Sélectionnez une conversation
              </Title>
              <Text type="secondary">
                Choisissez une conversation pour commencer à discuter
              </Text>
              {conversations.length === 0 && (
                <Button
                  type="primary"
                  onClick={handleStartConversationWithAdmin}
                  style={{ marginTop: "16px" }}
                  icon={<CustomerServiceOutlined />}
                >
                  Contacter le support
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ClientMessagesPage;
