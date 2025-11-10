/**
 * Firebase Configuration
 * 
 * Firebase is initialized automatically by @react-native-firebase/app
 * using the native config files:
 * - iOS: GoogleService-Info.plist
 * - Android: google-services.json
 * 
 * No manual initialization required!
 */

export const FIREBASE_CONFIG = {
  projectId: 'tonemap-14a81',
  appId: {
    ios: '1:345211832799:ios:55615d0d1f51bad0e45c6a',
    android: '1:345211832799:android:216d672395c92512e45c6a',
  },
  apiKey: {
    ios: 'AIzaSyBScaEr6dehbCGjhE5joqLRWMk7x3Y_Dqg',
    android: 'AIzaSyCAP-ab4J43ygfra0nSMFQlxhcZiDEZ-z4',
  },
  authDomain: 'tonemap-14a81.firebaseapp.com',
  storageBucket: 'tonemap-14a81.firebasestorage.app',
};

// Test Firebase connection
export const testFirebaseConnection = async (): Promise<boolean> => {
  try {
    const auth = (await import('@react-native-firebase/auth')).default;
    console.log('✅ Firebase Auth module loaded successfully');
    console.log('Firebase Auth instance:', auth().app.name);
    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return false;
  }
};
