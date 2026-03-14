"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { clientEnv, hasFirebaseClientEnv } from "@/lib/env";

let app: FirebaseApp | null = null;

function getFirebaseApp() {
  if (!hasFirebaseClientEnv) {
    return null;
  }
  if (app) {
    return app;
  }
  if (getApps().length > 0) {
    app = getApps()[0] ?? null;
    return app;
  }
  app = initializeApp({
    apiKey: clientEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: clientEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: clientEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: clientEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: clientEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: clientEnv.NEXT_PUBLIC_FIREBASE_APP_ID
  });
  return app;
}

export function getFirebaseClientAuth() {
  const firebaseApp = getFirebaseApp();
  return firebaseApp ? getAuth(firebaseApp) : null;
}

export async function signInWithGoogle() {
  const auth = getFirebaseClientAuth();
  if (!auth) {
    throw new Error("Firebase client environment is not configured.");
  }
  await setPersistence(auth, browserLocalPersistence);
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutUser() {
  const auth = getFirebaseClientAuth();
  if (!auth) {
    return;
  }
  await signOut(auth);
}

