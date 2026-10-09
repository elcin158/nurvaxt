import { jest } from '@jest/globals';
// Jest factory must resolve this mock within its isolated module context.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
