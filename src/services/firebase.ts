import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import type { Auth } from "firebase/auth";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

/**
 * Reads Firebase configuration strictly from Vite environment variables.
 * Does not use localStorage or hardcoded credentials.
 */
export const getFirebaseConfigFromEnv = (): FirebaseConfig | null => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  // Real Google Cloud / Firebase API keys start with AIza and are at least 35 characters
  if (
    apiKey &&
    typeof apiKey === "string" &&
    apiKey.startsWith("AIza") &&
    apiKey.length >= 35 &&
    !apiKey.includes("YOUR_") &&
    !apiKey.includes("DUMMY")
  ) {
    return {
      apiKey: apiKey.trim(),
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId || "crave-recipe-app"}.firebaseapp.com`,
      projectId: (projectId || "crave-recipe-app").trim(),
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    };
  }

  return null;
};

export const isFirebaseConfigured = (): boolean => {
  const cfg = getFirebaseConfigFromEnv();
  return Boolean(cfg?.apiKey && cfg.apiKey.startsWith("AIza"));
};

let currentAuth: Auth | null = null;
let currentProvider: GoogleAuthProvider | null = null;

export const initFirebase = (): Auth | null => {
  const cfg = getFirebaseConfigFromEnv();
  if (!cfg) return null;

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(cfg);
    currentAuth = getAuth(app);
    currentProvider = new GoogleAuthProvider();
    currentProvider.setCustomParameters({ prompt: "select_account" });
    return currentAuth;
  } catch (err) {
    console.warn("Failed to initialize Firebase with environment configuration:", err);
    return null;
  }
};

// Initial startup initialization
initFirebase();

export interface GoogleAuthResult {
  email: string;
  name: string;
  uid: string;
  idToken: string;
  photoURL?: string | null;
}

/**
 * Maps raw Firebase errors into friendly, professional guidance.
 */
export const formatFirebaseAuthError = (error: any): string => {
  const code = error?.code || "";
  const msg = error?.message || "";

  if (
    code === "auth/api-key-not-valid" ||
    code.includes("invalid-api-key") ||
    msg.includes("api-key-not-valid") ||
    msg.includes("invalid-api-key") ||
    msg === "FIREBASE_NOT_CONFIGURED"
  ) {
    return "Firebase Google Authentication is not configured with a valid API key yet. Please add your credentials to the project's .env file (VITE_FIREBASE_API_KEY). Standard email/password sign-in and guest browsing are fully available.";
  }

  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "Google sign-in popup was closed before completing.";
  }

  if (code === "auth/popup-blocked") {
    return "The Google sign-in popup was blocked by your browser. Please allow popups for this site.";
  }

  if (code === "auth/operation-not-allowed") {
    return "Google Sign-In is not enabled in your Firebase Console. Go to Firebase Console > Authentication > Sign-in method and enable Google.";
  }

  if (code === "auth/unauthorized-domain") {
    return "This domain (localhost) is not authorized in Firebase Console. Go to Authentication > Settings > Authorized domains and ensure 'localhost' is listed.";
  }

  if (code === "auth/network-request-failed") {
    return "Network error connecting to Google Authentication. Please check your internet connection.";
  }

  return error?.message || "Failed to authenticate with Google.";
};

/**
 * Triggers the official Google Sign-In popup using the Firebase Auth SDK.
 * Returns the authenticated user's profile and cryptographically signed ID Token.
 */
export const signInWithGooglePopup = async (): Promise<GoogleAuthResult> => {
  if (!isFirebaseConfigured()) {
    throw new Error("FIREBASE_NOT_CONFIGURED");
  }

  let authInstance = currentAuth;
  if (!authInstance) {
    authInstance = initFirebase();
  }

  if (!authInstance || !currentProvider) {
    throw new Error("FIREBASE_NOT_CONFIGURED");
  }

  try {
    const result = await signInWithPopup(authInstance, currentProvider);
    const user = result.user;
    const idToken = await user.getIdToken();

    return {
      email: user.email || "",
      name: user.displayName || user.email?.split("@")[0] || "Chef",
      uid: user.uid,
      idToken,
      photoURL: user.photoURL,
    };
  } catch (error: any) {
    console.error("Firebase Google Auth Error:", error);
    const friendlyMessage = formatFirebaseAuthError(error);
    throw new Error(friendlyMessage);
  }
};
