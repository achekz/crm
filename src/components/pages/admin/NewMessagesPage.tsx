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
} from "antd";
import { SendOutlined, UserOutlined, PlusOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../../store";
import { useSocket } from "../../../hooks/useSocket";
import socketService from "../../../services/socketService";
import {
  setActiveConversation,
  fetchConversations,
  fetchMessages,
  markMessagesAsRead,
} from "../../../store/slices/messagesSlice";
import { fetchClients } from "../../../store/slices/clientsSlice";
import { Message, Conversation } from "../../../types/messageTypes";
import { Client } from "../../../store/slices/clientsSlice";
import "./MessagesPage.css";

const { Title, Text } = Typography;
const { TextArea } = Input;

const MessagesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { conversations, activeConversation, loading } = useSelector(
    (state: RootState) => state.messages
  );
  const { clients } = useSelector((state: RootState) => state.clients);
  const { user } = useSelector((state: RootState) => state.auth);
  const { sendMessage, markAsRead, joinConversation, isConnected } =
    useSocket();

  // Local state for real-time messages
  const [conversationMessages, setConversationMessages] = useState<Message[]>(
    []
  );
  const [newMessage, setNewMessage] = useState("");
  const [showAvailableClients, setShowAvailableClients] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  useEffect(() => {
    dispatch(fetchConversations());
    dispatch(fetchClients());
  }, [dispatch]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      console.log("🔄 Fetching messages for conversation:", activeConversation);

      // Always fetch to ensure we have the latest messages
      dispatch(fetchMessages(activeConversation))
        .then((result) => {
          if (
            result.payload &&
            typeof result.payload === "object" &&
            "messages" in result.payload
          ) {
            const fetchedMessages =
              (result.payload as { messages: Message[] }).messages || [];
            console.log(
              "📥 Got messages from API:",
              fetchedMessages.length,
              "messages"
            );

            // Set the messages from API - this is the authoritative source
            setConversationMessages(fetchedMessages);
          } else {
            console.log("❌ No messages in API response - setting empty array");
            setConversationMessages([]);
          }
        })
        .catch((error) => {
          console.error("❌ Error fetching messages:", error);
          // Don't clear existing messages on error - leave them as is
        });

      // Join the conversation room for real-time updates
      joinConversation(activeConversation);
    } else {
      // Clear messages when no conversation is active
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
          console.log("📦 Previous messages count:", prev.length);

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

          // Check if message already exists (avoid duplicates)
          const exists = prev.some((m) => m.id === message.id);
          if (exists) {
            console.log("📝 Message already exists, skipping...");
            return prev;
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
      } else {
        console.log("❌ Message not for current conversation");
      }
    };

    // Use the already imported socketService
    socketService.onNewMessage(handleNewMessage);
    socketService.onMessageSent(({ message }: { message: Message }) => {
      console.log("✅ Message sent confirmation received:", message);
      // Handle sent messages the same way as new messages
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

  // Find active conversation or create a temporary one for new conversations
  let activeConversationData = conversations.find(
    (conv: Conversation) => conv.conversationId === activeConversation
  );

  // If no conversation found but we have an active conversation ID,
  // create a temporary conversation object for new conversations
  if (!activeConversationData && activeConversation) {
    // Extract the client ID from the conversation ID
    const conversationParts = activeConversation.split("_");
    const otherUserId = conversationParts.find((id) => id !== user?.id);
    const client = clients.find((c) => c.id === otherUserId);

    if (client) {
      activeConversationData = {
        conversationId: activeConversation,
        otherUser: {
          id: client.id,
          name: client.name,
          email: client.email,
          role: "client" as const,
          avatar: client.avatar,
        },
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

    // Use activeConversationData instead of searching in conversations array
    if (!activeConversationData) return;

    try {
      // Store the message content before clearing the input
      const messageContent = newMessage.trim();
      setNewMessage("");

      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp_${Date.now()}`,
        senderId: {
          id: user?.id || "",
          name: user?.name || "",
          email: user?.email || "",
          role: user?.role || "admin",
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
      console.log(
        "🚀 Sending message via socket to:",
        activeConversationData.otherUser.id
      );
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

  const handleTyping = (value: string) => {
    setNewMessage(value);
  };

  const getConversationMessages = () => {
    console.log(
      "📋 Getting conversation messages:",
      conversationMessages.length
    );
    console.log(
      "📝 Messages:",
      conversationMessages.map((m) => ({
        id: m.id,
        content: m.content?.substring(0, 20),
        timestamp: m.timestamp,
      }))
    );
    return conversationMessages;
  };

  const handleStartConversation = async (clientId: string) => {
    try {
      // Create a conversation ID based on admin and client IDs (sorted for consistency)
      const ids = [user?.id, clientId].sort();
      const conversationId = `${ids[0]}_${ids[1]}`;
      dispatch(setActiveConversation(conversationId));
      setShowAvailableClients(false);

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

  // Get clients that don't have existing conversations
  const getAvailableClients = () => {
    const conversationClientIds = conversations.map(
      (conv) => conv.otherUser.id
    );
    return clients.filter(
      (client) => !conversationClientIds.includes(client.id)
    );
  };

  return (
    <div className="messages-page">
      <div className="page-header">
        <Title level={2}>Messagerie</Title>
        <Text type="secondary">
          Communiquez avec{" "}
          {user?.role === "admin" ? "vos clients" : "votre support"}
          {!isConnected() && <Text type="danger"> • Hors ligne</Text>}
        </Text>
      </div>

      <div className="messages-container">
        {/* Conversations List */}
        <Card
          className="conversations-list"
          title={
            <div className="flex justify-between items-center">
              <span>Conversations</span>
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setShowAvailableClients(!showAvailableClients)}
              >
                {showAvailableClients ? "Masquer" : "Nouveau"}
              </Button>
            </div>
          }
          loading={loading}
          bodyStyle={{ padding: 0 }}
        >
          {showAvailableClients ? (
            // Show available clients to start conversations
            <div>
              <div
                className="available-clients-header"
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #f0f0f0",
                  backgroundColor: "#fafafa",
                }}
              >
                <Text type="secondary">Démarrer une conversation avec:</Text>
              </div>
              {getAvailableClients().length === 0 ? (
                <div
                  className="empty-conversations"
                  style={{ padding: "20px", textAlign: "center" }}
                >
                  <Text type="secondary">
                    Tous les clients ont déjà des conversations
                  </Text>
                </div>
              ) : (
                <List
                  dataSource={getAvailableClients()}
                  renderItem={(client: Client) => (
                    <List.Item
                      className="conversation-item"
                      onClick={() => handleStartConversation(client.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar src={client.avatar} icon={<UserOutlined />} />
                        }
                        title={
                          <div className="conversation-title">
                            <span>{client.name}</span>
                            <Text
                              type="secondary"
                              className="conversation-role"
                            >
                              Client - {client.company}
                            </Text>
                          </div>
                        }
                        description={
                          <Text type="secondary">
                            Cliquez pour démarrer une conversation
                          </Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          ) : (
            // Show existing conversations
            <>
              {conversations.length === 0 ? (
                <div className="empty-conversations">
                  <Text type="secondary">Aucune conversation active</Text>
                  <br />
                  <Button
                    type="link"
                    onClick={() => setShowAvailableClients(true)}
                    style={{ padding: 0, marginTop: 8 }}
                  >
                    Démarrer une nouvelle conversation
                  </Button>
                </div>
              ) : (
                <List
                  dataSource={conversations}
                  renderItem={(conversation: Conversation) => (
                    <List.Item
                      className={`conversation-item ${
                        activeConversation === conversation.conversationId
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        dispatch(
                          setActiveConversation(conversation.conversationId)
                        )
                      }
                    >
                      <List.Item.Meta
                        avatar={
                          <Badge count={conversation.unreadCount} size="small">
                            <Avatar
                              src={conversation.otherUser.avatar}
                              icon={<UserOutlined />}
                            />
                          </Badge>
                        }
                        title={
                          <div className="conversation-title">
                            <span>{conversation.otherUser.name}</span>
                            <Text
                              type="secondary"
                              className="conversation-role"
                            >
                              {conversation.otherUser.role === "admin"
                                ? "Admin"
                                : "Client"}
                            </Text>
                          </div>
                        }
                        description={
                          conversation.lastMessage ? (
                            <Text ellipsis className="last-message">
                              {conversation.lastMessage.content}
                            </Text>
                          ) : (
                            <Text type="secondary">Aucun message</Text>
                          )
                        }
                      />
                      {conversation.lastMessage && (
                        <Text type="secondary" className="message-time">
                          {new Date(
                            conversation.lastMessage.timestamp
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      )}
                    </List.Item>
                  )}
                />
              )}
            </>
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
                  icon={<UserOutlined />}
                />
                <div>
                  <div>{activeConversationData.otherUser.name}</div>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {activeConversationData.otherUser.role === "admin"
                      ? "Admin"
                      : "Client"}
                  </Text>
                </div>
              </Space>
            ) : (
              "Messagerie"
            )
          }
          bodyStyle={{
            padding: 0,
            height: "600px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {activeConversationData ? (
            <>
              {/* Messages */}
              <div className="messages-content">
                {loading ? (
                  <div className="messages-loading">
                    <Spin />
                  </div>
                ) : (
                  <>
                    {getConversationMessages().map((message: Message) => (
                      <div
                        key={message.id}
                        className={`message ${
                          message.senderId.role === "admin"
                            ? "admin-message"
                            : "client-message"
                        }`}
                      >
                        <div className="message-content">
                          <div className="message-text">{message.content}</div>
                          <div className="message-meta">
                            <span className="message-time">
                              {new Date(message.timestamp).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                            {message.senderId.role === "admin" &&
                              message.senderId.id === user?.id && (
                                <span className="message-status">
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
              <div className="message-input">
                <TextArea
                  value={newMessage}
                  onChange={(e) => handleTyping(e.target.value)}
                  placeholder="Tapez votre message..."
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={!isConnected()}
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
            <div className="no-conversation">
              <div className="no-conversation-content">
                <UserOutlined style={{ fontSize: "64px", color: "#d9d9d9" }} />
                <Title level={4} type="secondary">
                  Sélectionnez une conversation
                </Title>
                <Text type="secondary">
                  Choisissez une conversation pour commencer à discuter
                </Text>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MessagesPage;
