import React, { useState, lazy, Suspense } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  Layout,
  Menu,
  Badge,
  Dropdown,
  Avatar,
  Button,
  Typography,
  Drawer,
  Divider,
  List,
} from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  FolderOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CalendarOutlined,
  DollarOutlined,
  MessageOutlined,
  CrownOutlined,
  EditOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { logout } from "../../store/slices/authSlice";
import { markAllAsRead } from "../../store/slices/notificationsSlice";
import LoadingFallback from "../routing/LoadingFallback";
import FloatingSupportChat from "../common/FloatingSupportChat";

// Lazy load client pages
const ClientDashboard = lazy(() => import("../pages/client/ClientDashboard"));
const ClientInvoicesPage = lazy(() => import("../pages/client/ClientInvoicesPage"));
const ClientPaymentsPage = lazy(() => import("../pages/client/ClientPaymentsPage"));
const ClientMessagesPage = lazy(() => import("../pages/client/ClientMessagesPage"));
const ClientAppointmentsPage = lazy(() => import("../pages/client/ClientAppointmentsPage"));
const ClientDocumentsPage = lazy(() => import("../pages/client/ClientDocumentsPage"));

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const ClientLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { notifications, unreadCount } = useSelector(
    (state: RootState) => state.notifications
  );

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleNotificationOpen = (open: boolean) => {
    if (open && unreadCount > 0) {
      dispatch(markAllAsRead());
    }
  };

  const notificationMenu = (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 min-w-[400px] max-h-[500px] overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-lg">Notifications</div>
          <div className="text-teal-100 text-sm">{unreadCount} non lues</div>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <BellOutlined className="text-3xl mb-2 opacity-50" />
            <div>Aucune notification</div>
          </div>
        ) : (
          <List
            dataSource={notifications.slice(0, 10)}
            renderItem={(notification) => (
              <List.Item
                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-4 ${
                  !notification.read
                    ? "border-l-teal-500 bg-teal-50"
                    : "border-l-transparent"
                }`}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        notification.type === "success"
                          ? "bg-green-100"
                          : notification.type === "warning"
                          ? "bg-orange-100"
                          : notification.type === "error"
                          ? "bg-red-100"
                          : "bg-teal-100"
                      }`}
                    >
                      <BellOutlined
                        className={`${
                          notification.type === "success"
                            ? "text-green-600"
                            : notification.type === "warning"
                            ? "text-orange-600"
                            : notification.type === "error"
                            ? "text-red-600"
                            : "text-teal-600"
                        }`}
                      />
                    </div>
                  }
                  title={
                    <div className="flex items-center justify-between">
                      <Text
                        strong
                        className={
                          !notification.read ? "text-gray-900" : "text-gray-600"
                        }
                      >
                        {notification.title}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        {new Date(notification.timestamp).toLocaleDateString()}
                      </Text>
                    </div>
                  }
                  description={
                    <Text
                      className={
                        !notification.read ? "text-gray-700" : "text-gray-500"
                      }
                    >
                      {notification.message}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>

      <div className="p-3 border-t bg-gray-50 flex justify-between">
        <Button
          type="text"
          size="small"
          onClick={() => {
            dispatch(markAllAsRead());
            console.log("All notifications marked as read");
          }}
          disabled={unreadCount === 0}
        >
          Tout marquer comme lu
        </Button>
        <Button
          type="link"
          size="small"
          onClick={() => console.log("Navigating to notifications page")}
        >
          Voir toutes
        </Button>
      </div>
    </div>
  );

  const userMenu = (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 min-w-[280px]">
      {/* User Info Header */}
      <div className="p-4 bg-gradient-to-r from-teal-500 to-teal-600 rounded-t-xl">
        <div className="flex items-center space-x-3">
          <Avatar
            src={user?.avatar}
            icon={<UserOutlined />}
            size={48}
            className="border-2 border-white shadow-md"
          />
          <div className="text-white">
            <div className="font-semibold text-lg">{user?.name}</div>
            <div className="text-teal-100 text-sm">{user?.company}</div>
            <div className="flex items-center space-x-1 mt-1">
              <CrownOutlined className="text-yellow-300 text-xs" />
              <span className="text-teal-100 text-xs">Client Premium</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-2">
        <div className="py-2">
          <button
            className="w-full flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
            onClick={() => console.log("Navigating to profile page")}
          >
            <UserOutlined className="text-gray-500" />
            <span className="font-medium">Mon profil</span>
          </button>

          <button
            className="w-full flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
            onClick={() => console.log("Opening profile editor")}
          >
            <EditOutlined className="text-gray-500" />
            <span className="font-medium">Modifier le profil</span>
          </button>

          <button
            className="w-full flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
            onClick={() => console.log("Opening settings")}
          >
            <SettingOutlined className="text-gray-500" />
            <span className="font-medium">Paramètres</span>
          </button>

          <button
            className="w-full flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
            onClick={() => console.log("Opening help & support")}
          >
            <QuestionCircleOutlined className="text-gray-500" />
            <span className="font-medium">Aide & Support</span>
          </button>
        </div>

        <Divider className="my-2" />

        <button
          className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
          onClick={handleLogout}
        >
          <LogoutOutlined />
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </div>
  );

  const menuItems = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: "Tableau de bord",
    },
    {
      key: "invoices",
      icon: <FileTextOutlined />,
      label: "Mes factures",
    },
    {
      key: "payments",
      icon: <DollarOutlined />,
      label: "Mes paiements",
    },
    {
      key: "appointments",
      icon: <CalendarOutlined />,
      label: "Rendez-vous",
    },
    {
      key: "messages",
      icon: <MessageOutlined />,
      label: "Messages",
    },
    {
      key: "documents",
      icon: <FolderOutlined />,
      label: "Documents",
    },
  ];

  // Get current selected key from location
  const getCurrentKey = () => {
    const path = location.pathname;
    if (path.includes("/invoices")) return "invoices";
    if (path.includes("/payments")) return "payments";
    if (path.includes("/appointments")) return "appointments";
    if (path.includes("/messages")) return "messages";
    if (path.includes("/documents")) return "documents";
    return "dashboard";
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key === "dashboard" ? "/client/dashboard" : `/client/${key}`);
    setMobileMenuVisible(false);
  };

  return (
    <Layout className="min-h-screen">
      {/* Mobile Drawer */}
      <Drawer
        title={
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <CrownOutlined className="text-white text-lg" />
            </div>
            <div>
              <div className="font-bold text-lg text-gray-800">ERP Pro</div>
              <div className="text-xs text-gray-500">Client Portal</div>
            </div>
          </div>
        }
        placement="left"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        className="lg:hidden"
        width={280}
      >
        <Menu
          mode="inline"
          selectedKeys={[getCurrentKey()]}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-none"
        />
      </Drawer>

      {/* Desktop Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="sidebar hidden lg:block"
        width={280}
        collapsedWidth={80}
      >
        <div className="logo transition-all duration-300">
          {collapsed ? (
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg mx-auto">
              <CrownOutlined className="text-white text-xl" />
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <CrownOutlined className="text-white text-xl" />
              </div>
              <div>
                <div className="text-white font-bold text-xl">ERP Pro</div>
                <div className="text-teal-200 text-sm">Client Portal</div>
              </div>
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getCurrentKey()]}
          items={menuItems}
          onClick={handleMenuClick}
          className="mt-4"
        />
      </Sider>

      <Layout>
        <Header className="header">
          <div className="flex justify-between items-center h-full px-6">
            {/* Mobile menu button */}
            <Button
              type="text"
              icon={<MenuFoldOutlined />}
              onClick={() => setMobileMenuVisible(true)}
              className="lg:hidden text-gray-600 hover:text-gray-800"
            />

            {/* Desktop collapse button */}
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex text-gray-600 hover:text-gray-800 text-lg w-16 h-16 items-center justify-center"
            />

            {/* Company name - visible on mobile */}
            <div className="lg:hidden flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                <CrownOutlined className="text-white text-sm" />
              </div>
              <Text strong className="text-lg text-gray-800">
                {user?.company}
              </Text>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <Dropdown
                overlay={notificationMenu}
                placement="bottomRight"
                trigger={["click"]}
                onOpenChange={handleNotificationOpen}
              >
                <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                  <Button
                    type="text"
                    icon={<BellOutlined />}
                    className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg w-10 h-10 flex items-center justify-center transition-all duration-200"
                  />
                </Badge>
              </Dropdown>

              {/* User dropdown */}
              <Dropdown
                overlay={userMenu}
                placement="bottomRight"
                trigger={["click"]}
                overlayClassName="user-dropdown"
              >
                <div className="user-info cursor-pointer hover:bg-gray-50 rounded-xl p-2 transition-all duration-200">
                  <Avatar
                    src={user?.avatar}
                    icon={<UserOutlined />}
                    size={44}
                    className="border-2 border-teal-200 shadow-lg"
                  />
                  <div className="ml-3 hidden sm:block">
                    <div className="text-gray-800 font-semibold text-sm leading-tight">
                      {user?.name}
                    </div>
                    <div className="text-gray-500 text-xs leading-tight mt-0.5">
                      {user?.company}
                    </div>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-green-600 text-xs font-medium">
                        En ligne
                      </span>
                    </div>
                  </div>
                </div>
              </Dropdown>
            </div>
          </div>
        </Header>

        <Content className="p-6 overflow-initial">
          <div className="min-h-screen">
            <Suspense fallback={<LoadingFallback message="Chargement de la page..." />}>
              <Routes>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<ClientDashboard />} />
                <Route path="invoices" element={<ClientInvoicesPage />} />
                <Route path="payments" element={<ClientPaymentsPage />} />
                <Route path="messages" element={<ClientMessagesPage />} />
                <Route path="appointments" element={<ClientAppointmentsPage />} />
                <Route path="documents" element={<ClientDocumentsPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </Suspense>
          </div>
        </Content>

        {/* Floating Support Chat */}
        <FloatingSupportChat />
      </Layout>
    </Layout>
  );
};

export default ClientLayout;
