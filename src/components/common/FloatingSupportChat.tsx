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
        date: 'Aujourd\'hui'
      };
    }
    
    // Format time as HH:MM
    const time = date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false  // Use 24-hour format
    });
    
    // Check if time is valid (not "Invalid Date")
    if (time === 'Invalid Date') {
       return {
        time: '--:--',
        date: 'Aujourd\'hui'
      };
    }
    
    // Format date - if today, show "Today", if this year show day/month, else show full date
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                   date.getMonth() === today.getMonth() &&
                   date.getFullYear() === today.getFullYear();
                   
    const isThisYear = date.getFullYear() === today.getFullYear();
    
    let formattedDate;
    if (isToday) {
      formattedDate = 'Aujourd\'hui';
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
      date: 'Aujourd\'hui' 
    };
  }
};

const FloatingSupportChat: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { unreadCount, availableUsers } = useSelector((state: RootState) => state.messages);
  // Always read user from both Redux AND localStorage so it's available immediately after refresh
  const { user: reduxUser } = useSelector((state: RootState) => state.auth);
  const user = reduxUser || (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();
  const { sendMessage, isConnected, joinConversation } = useSocket();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Store activeConversationId in a ref so socket handlers always have the current value
  const activeConvIdRef = useRef<string | null>(null);
  const currentUserId = user?.id;

  // Keep ref in sync
  useEffect(() => {
    activeConvIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Fetch initial data when component mounts / user changes
  useEffect(() => {
    if (user) {
      dispatch(fetchConversations());
      dispatch(fetchAvailableUsers());
    }
  }, [dispatch, user?.id]);

  // Get or create conversation with admin support
  useEffect(() => {
    if (!user || availableUsers.length === 0) return;

    const adminUser = availableUsers.find(u => u.role === 'admin');
    if (!adminUser) return;

    const conversationId = generateConversationId(user.id, adminUser.id);

    // Always (re)fetch messages when we have a conversation id — covers reload case
    if (activeConversationId !== conversationId) {
      setActiveConversationId(conversationId);
    }

    dispatch(fetchMessages(conversationId)).then((result) => {
      const payload = result.payload as { conversationId: string; messages: Message[] } | undefined;
      if (payload && Array.isArray(payload.messages)) {
        setConversationMessages(payload.messages);
      }
    });
  }, [user?.id, availableUsers, dispatch]);

  // Join conversation room — retry until socket is actually connected
  useEffect(() => {
    if (!activeConversationId) return;

    // Try immediately
    if (isConnected()) {
      joinConversation(activeConversationId);
    }

    // Also join when the socket connects (handles the race condition where
    // socket wasn't ready yet when activeConversationId was first set)
    const socket = socketService.getSocket();
    if (socket) {
      const onConnect = () => {
        if (activeConvIdRef.current) {
          joinConversation(activeConvIdRef.current);
        }
      };
      socket.on('connect', onConnect);
      return () => { socket.off('connect', onConnect); };
    }
  }, [activeConversationId, isConnected, joinConversation]);

  // Helper to check duplicates
  const isDuplicateMessage = (newMsg: Message, existingMessages: Message[]): boolean => {
    return existingMessages.some(
      msg =>
        msg.id === newMsg.id ||
        (newMsg.tempId && msg.tempId === newMsg.tempId) ||
        (!!newMsg.id && !!msg.id && newMsg.id === msg.id)
    );
  };

  // Real-time socket listeners — re-register whenever user/conversation changes
  useEffect(() => {
    if (!user) return;

    const handleNewMessage = (message: Message) => {
      // Accept messages from ANY conversation with an admin (not just the specific conversation ID)
      // This handles the case of multiple admin accounts messaging the same client
      const senderIsAdmin = 
        (typeof message.senderId === 'object' && (message.senderId as any)?.role === 'admin');
      
      const receiverIsAdmin = 
        (typeof message.receiverId === 'object' && (message.receiverId as any)?.role === 'admin');
      
      const messageIsWithAdmin = senderIsAdmin || receiverIsAdmin;
      
      // DEBUG: Log the check to understand why messages aren't being received
      console.log('[FloatChat receive] senderIsAdmin:', senderIsAdmin, '| receiverIsAdmin:', receiverIsAdmin, '| senderIdObj:', JSON.stringify(message.senderId).substring(0, 100));
      
      if (!messageIsWithAdmin) {
        console.log('[FloatChat] IGNORING message - not from/to admin');
        return;
      }

      setConversationMessages(prev => {
        if (isDuplicateMessage(message, prev)) return prev;

        // Replace optimistic temp message if this is its server confirmation
        const filtered = prev.filter(m =>
          !m.tempId || !message.tempId || m.tempId !== message.tempId
        );
        return [...filtered, message].sort(
          (a, b) => new Date((a as any).timestamp || (a as any).createdAt || 0).getTime() -
                    new Date((b as any).timestamp || (b as any).createdAt || 0).getTime()
        );
      });
    };

    const handleMessageSent = ({ message, tempId }: { message: Message; tempId?: string }) => {
      // Replace optimistic message with confirmed server message
      setConversationMessages(prev => {
        const filtered = prev.filter(m => !tempId || m.tempId !== tempId);
        if (isDuplicateMessage(message, filtered)) return prev;
        return [...filtered, message].sort(
          (a, b) => new Date((a as any).timestamp || (a as any).createdAt || 0).getTime() -
                    new Date((b as any).timestamp || (b as any).createdAt || 0).getTime()
        );
      });
    };

    // Use named handlers with off(event, handler) to avoid removing other components' listeners
    socketService.off('message:new', handleNewMessage);
    socketService.off('message:sent', handleMessageSent);

    socketService.onNewMessage(handleNewMessage);
    socketService.onMessageSent(handleMessageSent);

    return () => {
      // Remove only THIS component's handlers — not all listeners on these events
      socketService.off('message:new', handleNewMessage);
      socketService.off('message:sent', handleMessageSent);
    };
  }, [user?.id, activeConversationId]);

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
                        // Extract senderId safely — handle both populated objects and string IDs
                        let senderIdStr = '';
                        if (typeof message.senderId === 'object' && message.senderId) {
                          // Populated sender object: prefer .id, fallback to ._id
                          senderIdStr = ((message.senderId as any).id || (message.senderId as any)._id || '');
                        } else if (typeof message.senderId === 'string') {
                          senderIdStr = message.senderId;
                        }
                        senderIdStr = String(senderIdStr).trim();

                        // Get current user ID safely
                        const safeCurrentUserId = (currentUserId || '').trim();

                        // Normalize both for comparison (handle MongoDB ObjectId string formats)
                        const senderIdNorm = senderIdStr.toLowerCase();
                        const userIdNorm = safeCurrentUserId.toLowerCase();
                        const isCurrentUser = !!(safeCurrentUserId && senderIdStr && senderIdNorm === userIdNorm);

                        const formattedDate = formatMessageDate(message.timestamp || (message as any).createdAt || new Date().toISOString());
                        const senderName = typeof message.senderId === 'object' && message.senderId?.name 
                          ? message.senderId.name 
                          : 'Support';
                        
                        return (
                          <div
                            key={message.id}
                            style={{
                              marginBottom: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
                              width: '100%'
                            }}
                          >
                            {!isCurrentUser && (
                              <div style={{ 
                                fontSize: '11px', 
                                fontWeight: 500, 
                                color: '#64748b',
                                marginBottom: '4px',
                                marginLeft: '8px'
                              }}>
                                {senderName}
                              </div>
                            )}
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
                                {formattedDate.time || '00:00'}
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