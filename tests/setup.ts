import { jest } from '@jest/globals';
// Jest factory must resolve this mock within its isolated module context.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// Reanimated's worklet runtime needs a native module, and its own mock still loads it, so the
// animated layers are stood up with plain views and the style worklets run inline instead.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (component: unknown) => component },
    // Stable across renders, exactly like the real hook: an identity that changed every
    // render would retrigger every effect that depends on it.
    useSharedValue: (value: unknown) => require('react').useRef({ value }).current,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (value: unknown) => value,
    Easing: { linear: (progress: number) => progress },
  };
});
