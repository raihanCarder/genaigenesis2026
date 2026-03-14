import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { hasFirebaseAdminEnv, serverEnv } from "@/lib/env";

function getAdminApp() {
  if (!hasFirebaseAdminEnv) {
    return null;
  }
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return initializeApp({
    credential: cert({
      projectId: serverEnv.FIREBASE_PROJECT_ID,
      clientEmail: serverEnv.FIREBASE_CLIENT_EMAIL,
      privateKey: serverEnv.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    })
  });
}

export function getFirebaseAdminAuth() {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseAdminFirestore() {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

