import React, { useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { OfflineProvider } from './src/context/OfflineContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { VerifyEmailScreen } from './src/screens/VerifyEmailScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import { RecordSaleScreen } from './src/screens/RecordSaleScreen';
import { SalesHistoryScreen } from './src/screens/SalesHistoryScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { DebtorsScreen } from './src/screens/DebtorsScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { AddEditInventoryScreen } from './src/screens/AddEditInventoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TeamManagementScreen } from './src/screens/TeamManagementScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { PurchasesScreen } from './src/screens/PurchasesScreen';
import { PurchasesHistoryScreen } from './src/screens/PurchasesHistoryScreen';
import { CreditorsScreen } from './src/screens/CreditorsScreen';
import { AddCreditorScreen } from './src/screens/AddCreditorScreen';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isCashier = user?.role === 'CASHIER';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.cardBg, borderTopColor: theme.border },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Sales') iconName = focused ? 'cart' : 'cart-outline';
          else if (route.name === 'History') iconName = focused ? 'receipt' : 'receipt-outline';
          else if (route.name === 'Inventory') iconName = focused ? 'cube' : 'cube-outline';
          else if (route.name === 'Debtors') iconName = focused ? 'people' : 'people-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Sales" component={RecordSaleScreen} options={{ title: 'Record Sale' }} />
      {!isCashier && (
        <Tab.Screen name="History" component={SalesHistoryScreen} options={{ title: 'History' }} />
      )}
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      {!isCashier && (
        <Tab.Screen name="Debtors" component={DebtorsScreen} />
      )}
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, isLoading } = useAuth();
  const { isDark, theme } = useTheme();
  
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped, payload:', data);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          user.emailVerified === false ? (
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          ) : (
            <React.Fragment>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="AddEditInventory" component={AddEditInventoryScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="TeamManagement" component={TeamManagementScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Expenses" component={ExpensesScreen} />
              <Stack.Screen name="Purchases" component={PurchasesScreen} />
              <Stack.Screen name="PurchasesHistory" component={PurchasesHistoryScreen} />
              <Stack.Screen name="Creditors" component={CreditorsScreen} />
              <Stack.Screen name="AddCreditor" component={AddCreditorScreen} options={{ presentation: 'modal' }} />
            </React.Fragment>
          )
        ) : (
          <React.Fragment>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </React.Fragment>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <OfflineProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppNavigator />
          </NotificationProvider>
        </AuthProvider>
      </OfflineProvider>
    </ThemeProvider>
  );
}