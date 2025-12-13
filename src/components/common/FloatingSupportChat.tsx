import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Input, Typography, Avatar, Badge, Tooltip, notification } from 'antd';
import {
  CustomerServiceOutlined,
  SendOutlined,
  CloseOutlined,
  MessageOutlined,
  PhoneOutlined,
  MailOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  UserOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { useSocket } from '../../hooks/useSocket';
import { fetchConversations, fetchMessages, fetchAvailableUsers } from '../../store/slices/messagesSlice';
import { Message, generateConversationId } from '../../types/messageTypes';
import socketService from '../../services/socketService';

const { Text, Title } = Typography;
const { TextArea } = Input;

// Helper function to format dates correctly and handle potential invalid dates
const formatMessageDate = (dateString: string): { time: string; date: string } => {
  try {
    // Try to create a valid date object
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return {
        time: '--:--',
        date: 'Today'
      };
    }
    
    // Format time as HH:MM
    const time = date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false  // Use 24-hour format
    });
    
    // Format date - if today, show "Today", if this year show day/month, else show full date
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                   date.getMonth() === today.getMonth() &&
                   date.getFullYear() === today.getFullYear();
                   
    const isThisYear = date.getFullYear() === today.getFullYear();
    
    let formattedDate;
    if (isToday) {
      formattedDate = 'Today';
    } else if (isThisYear) {
      formattedDate = date.toLocaleDateString([], { 
        day: '2-digit', 
        month: '2-digit' 
      });
    } else {
      formattedDate = date.toLocaleDateString([], { 
        day: '2-digit', 
        month: '2-digit',
        year: 'numeric'
      });
    }
    
    return { time, date: formattedDate };
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return { 
      time: '--:--', 
      date: 'Today' 
    };
  }
};

const FloatingSupportChat: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { unreadCount, availableUsers } = useSelector((state: RootState) => state.messages);
  const { user } = useSelector((state: RootState) => state.auth);
  const { sendMessage, isConnected, joinConversation } = useSocket();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketListenersInitialized = useRef(false);

  // Fetch initial data when component mounts
  useEffect(() => {
    if (user) {
      dispatch(fetchConversations());
      dispatch(fetchAvailableUsers());
    }
  }, [dispatch, user]);

  // Get or create conversation with support
  useEffect(() => {
    if (user && availableUsers.length > 0 && !activeConversationId) {
      const adminUser = availableUsers.find(u => u.role === 'admin');
      if (adminUser) {
        const conversationId = generateConversationId(user.id, adminUser.id);
        setActiveConversationId(conversationId);
        
        dispatch(fetchMessages(conversationId)).then((result) => {
          if (result.payload && typeof result.payload === 'object' && 'messages' in result.payload) {
            setConversationMessages((result.payload as { messages: Message[] }).messages || []);
          }
        });
      }
    }
  }, [user, availableUsers, activeConversationId, dispatch]);

  // Join conversation room when active conversation changes
  useEffect(() => {
    if (activeConversationId && isConnected()) {
      joinConversation(activeConversationId);
      console.log(`Joined conversation: ${activeConversationId}`);
    }
  }, [activeConversationId, joinConversation, isConnected]);

  // Helper function to check if two messages are duplicates
  const isDuplicateMessage = (newMsg: Message, existingMessages: Message[]): boolean => {
    return existingMessages.some(
      msg => 
        (msg.id === newMsg.id) || // Same server-generated ID
        (newMsg.tempId && msg.tempId === newMsg.tempId) || // Same temp ID
        (msg.content === newMsg.content && // Same content and similar timestamp (within 2 seconds)
         Math.abs(new Date(msg.timestamp).getTime() - new Date(newMsg.timestamp).getTime()) < 2000)
    );
  };

  // Listen for real-time messages
  useEffect(() => {
    if (!user || !activeConversationId) return;
    
    // Clean up previous listeners to prevent duplicates
    const cleanupSocketListeners = () => {
      socketService.off('message:new');
      socketService.off('message:sent');
      console.log('Cleaned up previous socket listeners');
    };
    
    cleanupSocketListeners();
    
    const handleNewMessage = (message: Message) => {
      console.log('Received message:', message);
      
      setConversationMessages(prev => {
        // Check if this message is already in our state
        if (isDuplicateMessage(message, prev)) {
          console.log('Duplicate message detected, ignoring:', message);
          return prev;
        }
        
        // Remove any optimistic message if this is the server confirmation
        const filteredMessages = prev.filter(m => 
          !m.tempId || (message.tempId && m.tempId !== message.tempId)
        );
        
        return [...filteredMessages, message].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });

      if (!isOpen) {
        notification.info({
          message: `Nouveau message de ${message.senderId.name}`,
          description: message.content.substring(0, 100),
          placement: 'topRight',
          duration: 4,
        });
      }
    };

    // Set up event listeners if not already initialized
    if (!socketListenersInitialized.current) {
      socketListenersInitialized.current = true;
      
      socketService.onNewMessage(handleNewMessage);
      
      socketService.onMessageSent(({ message, tempId }) => {
        console.log('Message sent confirmation:', message, tempId);
        // Only process if we have a tempId match
        if (tempId) {
          handleNewMessage(message);
        }
      });
      
      console.log('Socket listeners initialized');
    }

    return () => {
      cleanupSocketListeners();
      socketListenersInitialized.current = false;
    };
  }, [user, activeConversationId, isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversationId || !user) return;

    const adminUser = availableUsers.find(u => u.role === 'admin');
    if (!adminUser) {
      notification.error({
        message: 'Erreur',
        description: 'Aucun support disponible',
        placement: 'topRight',
      });
      return;
    }

    try {
      const messageContent = newMessage.trim();
      const tempId = `temp_${Date.now()}`;
      setNewMessage('');

      const optimisticMessage: Message = {
        id: tempId,
        senderId: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        receiverId: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          avatar: adminUser.avatar,
        },
        conversationId: activeConversationId,
        content: messageContent,
        messageType: 'text',
        timestamp: new Date().toISOString(),
        read: false,
        tempId,
      };

      // Add optimistic message to UI
      setConversationMessages(prev => {
        if (isDuplicateMessage(optimisticMessage, prev)) return prev;
        return [...prev, optimisticMessage];
      });

      // Send via socket
      await sendMessage({
        receiverId: adminUser.id,
        content: messageContent,
        messageType: 'text',
        tempId,
      });

      // No need to dispatch fetchConversations immediately
      // It will cause duplicate messages because the socket event will update UI
      // Let the socket event handler handle the update
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setConversationMessages(prev => prev.filter(msg => msg.id !== `temp_${Date.now()}`));
      notification.error({
        message: 'Erreur',
        description: "Impossible d'envoyer le message",
        placement: 'topRight',
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    { icon: <QuestionCircleOutlined />, text: 'FAQ', action: () => console.log('FAQ') },
    { icon: <PhoneOutlined />, text: 'Appeler', action: () => console.log('Call') },
    { icon: <MailOutlined />, text: 'Email', action: () => console.log('Email') },
  ];

  const quickMessages = [
    "J'ai une question sur ma facture",
    'Je souhaite modifier mon contrat',
    'Problème technique',
    'Demande de devis',
  ];

  const adminUser = availableUsers.find(u => u.role === 'admin');
  const onlineStatus = isConnected();

  return (
    <>
      {isOpen && (
        <div
          className={`fixed bottom-20 right-6 z-50 transition-all duration-300 ease-in-out transform ${
            isMinimized ? 'scale-95 opacity-90' : 'scale-100 opacity-100'
          }`}
          style={{
            width: '380px',
            height: isMinimized ? '60px' : '520px',
            filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.15))',
          }}
        >
          <Card
            style={{
              height: '100%',
              borderRadius: '16px',
              overflow: 'hidden',
              border: 'none',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            }}
            bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <div
              style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-20%',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  transform: 'rotate(45deg)',
                }}
              />
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar
                      size={40}
                      src={adminUser?.avatar}
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', border: '2px solid rgba(255, 255, 255, 0.3)' }}
                      icon={<CustomerServiceOutlined />}
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        onlineStatus ? 'bg-green-400' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{adminUser?.name || 'Support Client'}</div>
                    <div className="text-teal-100 text-sm flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${onlineStatus ? 'bg-green-300' : 'bg-gray-300'}`} />
                      <span>{onlineStatus ? 'En ligne' : 'Hors ligne'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    type="text"
                    size="small"
                    icon={<MinusOutlined />}
                    onClick={() => setIsMinimized(!isMinimized)}
                    style={{ color: 'white' }}
                    className="hover:bg-white hover:bg-opacity-20 rounded-lg"
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => setIsOpen(false)}
                    style={{ color: 'white' }}
                    className="hover:bg-white hover:bg-opacity-20 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {!isMinimized && (
              <>
                <div
                  style={{
                    flex: 1,
                    padding: '20px',
                    overflowY: 'auto',
                    backgroundColor: '#f8fafc',
                    maxHeight: '320px',
                    background: 'linear-gradient(to bottom, #f8fafc 0%, #ffffff 100%)',
                  }}
                >
                  {conversationMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748b' }}>
                      <div className="mb-4">
                        <RobotOutlined style={{ fontSize: '48px', color: '#0d9488' }} />
                      </div>
                      <Title level={4} style={{ color: '#1e293b', margin: '0 0 8px 0' }}>
                        Bonjour {user?.name} ! 👋
                      </Title>
                      <Text type="secondary" style={{ fontSize: '14px' }}>
                        Comment puis-je vous aider aujourd'hui ?
                      </Text>
                      <div className="mt-4 space-y-2">
                        {quickMessages.map((msg, index) => (
                          <Button
                            key={index}
                            size="small"
                            block
                            onClick={() => setNewMessage(msg)}
                            style={{
                              textAlign: 'left',
                              height: 'auto',
                              padding: '8px 12px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              background: 'white',
                              color: '#475569',
                              fontSize: '12px',
                            }}
                            className="hover:border-teal-300 hover:bg-teal-50"
                          >
                            {msg}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {conversationMessages.map((message) => {
                        const isCurrentUser = message.senderId.id === user?.id;
                        const formattedDate = formatMessageDate(message.timestamp);
                        
                        return (
                          <div
                            key={message.id}
                            style={{
                              marginBottom: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
                            }}
                          >
                            <div 
                              style={{
                                maxWidth: '85%',
                                minWidth: '120px',
                                padding: '12px 16px',
                                borderRadius: '18px',
                                backgroundColor: isCurrentUser ? '#2563eb' : '#ffffff',
                                color: isCurrentUser ? '#ffffff' : '#1e293b',
                                borderBottomRightRadius: isCurrentUser ? '6px' : '18px',
                                borderBottomLeftRadius: !isCurrentUser ? '6px' : '18px',
                                boxShadow: isCurrentUser 
                                  ? '0 4px 16px rgba(37, 99, 235, 0.2)' 
                                  : '0 4px 16px rgba(0, 0, 0, 0.08)',
                                border: !isCurrentUser ? '1px solid #e2e8f0' : 'none',
                                position: 'relative',
                                transition: 'all 0.2s ease',
                                animation: 'fadeIn 0.3s ease-out',
                              }}
                              className="hover:shadow-lg"
                            >
                              {!isCurrentUser && (
                                <div className="flex items-center space-x-2 mb-2">
                                  <Avatar 
                                    size={24} 
                                    src={message.senderId.avatar} 
                                    icon={<UserOutlined />}
                                    style={{
                                      border: '2px solid white',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                  />
                                  <Text style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>
                                    {message.senderId.name}
                                  </Text>
                                </div>
                              )}
                              <div 
                                style={{ 
                                  fontSize: '15px', 
                                  lineHeight: '1.5', 
                                  wordBreak: 'break-word',
                                  whiteSpace: 'pre-wrap'
                                }}
                              >
                                {message.content}
                              </div>
                              <div 
                                style={{ 
                                  fontSize: '11px', 
                                  opacity: 0.8, 
                                  marginTop: '6px', 
                                  textAlign: 'right',
                                  display: 'flex',
                                  justifyContent: 'flex-end',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                {formattedDate.time}
                                {isCurrentUser && (
                                  <span style={{ marginLeft: '4px', color: message.read ? '#34d399' : 'inherit' }}>
                                    {message.read ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: '5px',
                                  right: isCurrentUser ? '-8px' : 'auto',
                                  left: !isCurrentUser ? '-8px' : 'auto',
                                  width: 0,
                                  height: 0,
                                  borderTop: '8px solid transparent',
                                  borderBottom: '8px solid transparent',
                                  borderLeft: isCurrentUser ? `8px solid #2563eb` : 'none',
                                  borderRight: !isCurrentUser ? `8px solid #fff` : 'none',
                                }}
                              />
                            </div>
                            <div style={{ 
                              fontSize: '10px',
                              color: '#94a3b8',
                              marginTop: '2px',
                              marginLeft: isCurrentUser ? '0' : '12px',
                              marginRight: isCurrentUser ? '12px' : '0'
                            }}>
                              {formattedDate.date}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <div style={{ padding: '12px 20px 0', backgroundColor: '#ffffff' }}>
                  <div className="flex justify-center space-x-3">
                    {quickActions.map((action, index) => (
                      <Tooltip key={index} title={action.text}>
                        <Button
                          size="small"
                          icon={action.icon}
                          onClick={action.action}
                          style={{ borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}
                          className="hover:border-teal-300 hover:text-teal-600"
                        />
                      </Tooltip>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                    <TextArea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Tapez votre message..."
                      autoSize={{ minRows: 1, maxRows: 3 }}
                      onKeyPress={handleKeyPress}
                      disabled={!onlineStatus}
                      style={{ resize: 'none', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                      className="focus:border-teal-400 focus:shadow-sm"
                    />
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || !onlineStatus}
                      style={{
                        borderRadius: '12px',
                        height: '40px',
                        width: '40px',
                        background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                      }}
                      className="hover:shadow-lg transition-all duration-200"
                    />
                  </div>
                  <div style={{ marginTop: '8px', textAlign: 'center' }}>
                    <Text style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {onlineStatus ? 'Appuyez sur Entrée pour envoyer' : 'Connexion en cours...'}
                    </Text>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-40">
        <Tooltip
          title={
            <div className="text-center">
              <div className="font-medium">Besoin d'aide ?</div>
              <div className="text-xs opacity-75">Notre équipe est là pour vous</div>
            </div>
          }
          placement="left"
        >
          <Badge count={unreadCount} size="small" offset={[-8, 8]}>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={isOpen ? <MessageOutlined /> : <CustomerServiceOutlined />}
              onClick={() => setIsOpen(!isOpen)}
              style={{
                width: '64px',
                height: '64px',
                border: 'none',
                fontSize: '24px',
                background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                boxShadow: '0 8px 32px rgba(13, 148, 136, 0.4)',
                position: 'relative',
                overflow: 'hidden',
              }}
              className="hover:shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95"
            >
              {unreadCount > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.3)',
                    animation: 'pulse 2s infinite',
                  }}
                />
              )}
              {onlineStatus && (
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#10b981',
                    borderRadius: '50%',
                    border: '2px solid white',
                    boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3)',
                  }}
                />
              )}
            </Button>
          </Badge>
        </Tooltip>
      </div>

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
          
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </>
  );
};

export default FloatingSupportChat;