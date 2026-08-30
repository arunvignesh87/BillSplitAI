import { Capacitor, registerPlugin } from '@capacitor/core';

export const SmsReader = registerPlugin('SmsReader');

export const isNativeAndroid = () => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

export const getNativeInboxMessages = async () => {
  if (!isNativeAndroid()) return null;
  try {
    const result = await SmsReader.getRecentMessages();
    return result.messages || [];
  } catch (err) {
    console.warn('Native SMS read error:', err);
    throw err;
  }
};
