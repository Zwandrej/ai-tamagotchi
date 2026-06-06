/**
 * App — Root navigation. Terminal theme.
 */

import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useCreatureStore } from './store/useCreatureStore';
import { HomeScreen } from './screens/HomeScreen';
import { ChatScreen } from './screens/ChatScreen';
import { CreateCreatureScreen } from './screens/CreateCreatureScreen';
import { MemoryScreen } from './screens/MemoryScreen';
import { Term } from './theme';

export type RootStackParamList = {
  Home: undefined;
  Chat: undefined;
  Create: undefined;
  Memory: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: Term.text,
    background: Term.bg,
    card: Term.surface,
    text: Term.text,
    border: Term.border,
    notification: Term.red,
  },
};

const screenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: Term.surface },
  headerTintColor: Term.text,
  headerTitleStyle: { fontFamily: Term.font, fontWeight: '700', fontSize: Term.fontSize },
};

export default function App() {
  const creature = useCreatureStore((s) => s.creature);
  const ageCreature = useCreatureStore((s) => s.ageCreature);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      const current = useCreatureStore.getState().creature;
      if (current) ageCreature();
    }, 30000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [ageCreature]);

  // Don't render until we know whether a creature exists.
  // The 10ms setTimeout in useCreatureStore needs time to hydrate.
  // undefined = still loading, null = no creature, object = creature exists
  const [ready, setReady] = React.useState(false);
  useEffect(() => {
    // Check saved data once on mount, then show the right screen
    const id = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(id);
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: Term.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Term.textDim, fontFamily: Term.font, fontSize: 14 }}>booting...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={creature ? 'Home' : 'Create'}
        screenOptions={screenOptions}
      >
        <Stack.Screen
          name="Create"
          component={CreateCreatureScreen}
          options={{
            title: 'init_creature.sh',
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            title: `~/${creature?.name ?? 'tamagotchi'} $`,
            headerRight: () => (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => navigation.navigate('Memory')}>
                  <Text style={{ color: Term.textDim, fontSize: 12, fontFamily: Term.font }}>[mem]</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Chat')}>
                  <Text style={{ color: Term.text, fontSize: 12, fontFamily: Term.font }}>[chat]</Text>
                </TouchableOpacity>
              </View>
            ),
          })}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            title: 'chat.log',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="Memory"
          component={MemoryScreen}
          options={{
            title: 'memory.log',
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
