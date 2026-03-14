import type { ServiceWithMeta } from "@/lib/types";
import { getFirebaseAdminFirestore } from "@/lib/adapters/firebase-admin";

type FavoriteRecord = {
  serviceId: string;
  service: ServiceWithMeta;
  savedAt: string;
};

const memoryFavorites = new Map<string, Map<string, FavoriteRecord>>();

function getUserFavoritesMap(userId: string) {
  let favorites = memoryFavorites.get(userId);
  if (!favorites) {
    favorites = new Map<string, FavoriteRecord>();
    memoryFavorites.set(userId, favorites);
  }
  return favorites;
}

export async function listFavorites(userId: string) {
  const firestore = getFirebaseAdminFirestore();
  if (!firestore) {
    return Array.from(getUserFavoritesMap(userId).values())
      .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
      .map((entry) => entry.service);
  }
  const snapshot = await firestore
    .collection("users")
    .doc(userId)
    .collection("favorites")
    .orderBy("savedAt", "desc")
    .get();
  return snapshot.docs.map((doc) => doc.data().service as ServiceWithMeta);
}

export async function saveFavorite(userId: string, service: ServiceWithMeta) {
  const firestore = getFirebaseAdminFirestore();
  const savedAt = new Date().toISOString();
  if (!firestore) {
    getUserFavoritesMap(userId).set(service.id, {
      serviceId: service.id,
      service,
      savedAt
    });
    return;
  }
  await firestore.collection("users").doc(userId).collection("favorites").doc(service.id).set({
    serviceId: service.id,
    service,
    savedAt
  });
}

export async function removeFavorite(userId: string, serviceId: string) {
  const firestore = getFirebaseAdminFirestore();
  if (!firestore) {
    getUserFavoritesMap(userId).delete(serviceId);
    return;
  }
  await firestore.collection("users").doc(userId).collection("favorites").doc(serviceId).delete();
}
