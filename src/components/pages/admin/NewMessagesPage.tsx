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
  Image,
  Tooltip,
} from "antd";
import {
  SendOutlined,
  UserOutlined,
  PlusOutlined,
  PaperClipOutlined,
  FileOutlined,
  LoadingOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
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
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleNewMessage = (message: Message & { tempId?: string }) => {
      console.log("🔔 Real-time message received:", message);

      // Always refresh conversations to update the conversation list (last message preview)
      dispatch(fetchConversations());

      // Only add to local state if it's for the current active conversation
      if (message.conversationId === activeConversation) {
        console.log("✅ Adding message to current conversation");
        setConversationMessages((prev) => {
          // Check for duplicate by ID
          const exists = prev.some((m) => m.id === message.id);
          if (exists) {
            console.log("📝 Message already exists, skipping...");
            return prev;
          }

          // Check if this replaces a temporary message (optimistic update)
          if (message.tempId) {
             const tempExists = prev.some(m => m.id === message.tempId);
             if (tempExists) {
               console.log("🔄 Replacing temporary message with real one");
               return prev.map(m => m.id === message.tempId ? message : m);
             }
          }

          // Fallback: Check if there's a temp message with same content (legacy check)
          const legacyTempMatch = prev.find(
            (m) =>
              m.content === message.content &&
              m.id &&
              m.id.startsWith("temp_") &&
              m.senderId.id === message.senderId.id &&
              Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000 // Within 5 seconds
          );

          if (legacyTempMatch) {
             console.log("🔄 Replacing temporary message (legacy match)");
             return prev.map(m => m.id === legacyTempMatch.id ? message : m);
          }

          console.log("➕ Adding new message to conversation");
          return [...prev, message].sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
      }
    };

    // Define handlers
    const onNewMessageHandler = (msg: Message) => handleNewMessage(msg);
    const onMessageSentHandler = (data: { message: Message }) => handleNewMessage(data.message);

    // Register listeners
    socketService.onNewMessage(onNewMessageHandler);
    socketService.onMessageSent(onMessageSentHandler);

    return () => {
      // Cleanup SPECIFIC listeners to avoid removing global listeners from useSocket
      socketService.off("message:new", onNewMessageHandler);
      socketService.off("message:sent", onMessageSentHandler);
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

  const handleSendMessage = async (fileData?: {
    fileUrl: string;
    fileName: string;
    messageType: "file" | "image";
  }) => {
    if ((!newMessage.trim() && !fileData) || !activeConversation) return;

    // Use activeConversationData instead of searching in conversations array
    if (!activeConversationData) return;

    try {
      // Store the message content before clearing the input
      const messageContent = fileData
        ? `Sent a ${fileData.messageType}: ${fileData.fileName}`
        : newMessage.trim();
      
      if (!fileData) {
        setNewMessage("");
      }

      const tempId = `temp_${Date.now()}`;

      // Create optimistic message
      const optimisticMessage: Message = {
        id: tempId,
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
        messageType: fileData ? fileData.messageType : "text",
        fileName: fileData?.fileName,
        fileUrl: fileData?.fileUrl,
        timestamp: new Date().toISOString(),
        read: false,
      };

      // Add optimistic message immediately
      setConversationMessages((prev) => {
        return [...prev, optimisticMessage].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });

      // Send the message via socket
      console.log(
        "🚀 Sending message via socket to:",
        activeConversationData.otherUser.id
      );
      
      await sendMessage({
        receiverId: activeConversationData.otherUser.id,
        content: messageContent,
        messageType: fileData ? fileData.messageType : "text",
        fileName: fileData?.fileName,
        fileUrl: fileData?.fileUrl,
        tempId: tempId, // Pass tempId to backend
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

  const getMessageDate = (message: Message) => {
    return message.timestamp || message.createdAt || new Date().toISOString();
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "";
      }

      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      if (isToday) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } catch (e) {
      return "";
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.status === "success") {
        const messageType = file.type.startsWith("image/") ? "image" : "file";
        await handleSendMessage({
          fileUrl: data.data.fileUrl,
          fileName: data.data.fileName,
          messageType,
        });
      } else {
        throw new Error(data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      notification.error({
        message: "Erreur",
        description: "Échec de l'envoi du fichier",
      });
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const renderMessageContent = (message: Message) => {
    if (message.messageType === "image" && message.fileUrl) {
      const imageUrl = message.fileUrl.startsWith("http") 
        ? message.fileUrl 
        : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${message.fileUrl}`;
      
      return (
        <div style={{ marginBottom: "8px" }}>
          <Image
            src={imageUrl}
            alt="Image partagée"
            style={{ maxWidth: "200px", maxHeight: "300px", borderRadius: "8px" }}
          />
        </div>
      );
    } else if (message.messageType === "file" && message.fileUrl) {
      const fileUrl = message.fileUrl.startsWith("http")
        ? message.fileUrl
        : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${message.fileUrl}`;
        
      return (
        <div style={{ marginBottom: "8px" }}>
          <a 
            href={fileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px",
              backgroundColor: "rgba(0, 0, 0, 0.05)",
              borderRadius: "8px",
              textDecoration: "none",
              color: "inherit"
            }}
          >
            <FileOutlined style={{ fontSize: "20px" }} />
            <div>
              <div style={{ fontWeight: 500 }}>{message.fileName || "Fichier joint"}</div>
              <div style={{ fontSize: "11px", color: "#666" }}>Cliquez pour télécharger</div>
            </div>
            <DownloadOutlined />
          </a>
        </div>
      );
    }
    
    return <span>{message.content}</span>;
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
                              {conversation.lastMessage.messageType === "image" 
                                ? "📷 Image" 
                                : conversation.lastMessage.messageType === "file" 
                                  ? "📎 Fichier" 
                                  : conversation.lastMessage.content}
                            </Text>
                          ) : (
                            <Text type="secondary">Aucun message</Text>
                          )
                        }
                      />
                      {conversation.lastMessage && (
                        <Text type="secondary" className="message-time">
                          {formatMessageTime(getMessageDate(conversation.lastMessage))}
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
                    {getConversationMessages().map((message: Message) => {
                      const isCurrentUser = message.senderId.id === user?.id;
                      return (
                        <div
                          key={message.id}
                          style={{
                            marginBottom: "16px",
                            display: "flex",
                            justifyContent: isCurrentUser ? "flex-end" : "flex-start",
                            width: "100%"
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "70%",
                              backgroundColor: isCurrentUser ? "#1890ff" : "#ffffff",
                              color: isCurrentUser ? "#ffffff" : "#333333",
                              padding: "12px 16px",
                              borderRadius: "12px",
                              borderBottomLeftRadius: isCurrentUser ? "12px" : "4px",
                              borderBottomRightRadius: isCurrentUser ? "4px" : "12px",
                              border: isCurrentUser ? "none" : "1px solid #e8e8e8",
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                              position: "relative",
                              wordWrap: "break-word",
                              whiteSpace: "pre-wrap",
                              lineHeight: "1.4"
                            }}
                          >
                            {renderMessageContent(message)}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: "6px",
                                fontSize: "11px",
                                opacity: 0.8,
                                gap: "4px"
                              }}
                            >
                              <span>
                                {formatMessageTime(getMessageDate(message))}
                              </span>
                              {isCurrentUser && (
                                <span style={{ color: message.read ? "#52c41a" : "inherit" }}>
                                  {message.read ? "✓✓" : "✓"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <div className="message-input">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                />
                <Tooltip title="Joindre un fichier">
                  <Button
                    icon={isUploading ? <LoadingOutlined /> : <PaperClipOutlined />}
                    onClick={() => fileInputRef.current?.click()}
                    className="mr-2"
                    disabled={!isConnected() || isUploading}
                  />
                </Tooltip>
                
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
                  disabled={!isConnected() || isUploading}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => handleSendMessage()}
                  disabled={!newMessage.trim() || !isConnected() || isUploading}
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
