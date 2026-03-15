"use client";

import { create } from "zustand";
import type { LocationContext, ServiceCategory, ServiceWithMeta, SessionUser } from "@/lib/types";

type AppState = {
  location: LocationContext | null;
  services: ServiceWithMeta[];
  selectedCategory: ServiceCategory | null;
  user: SessionUser | null;
  authReady: boolean;
  favoriteServiceIds: string[];
  favoritesReady: boolean;
  setLocation: (location: LocationContext | null) => void;
  setServices: (services: ServiceWithMeta[]) => void;
  setSelectedCategory: (category: ServiceCategory | null) => void;
  setUser: (user: SessionUser | null) => void;
  setAuthReady: (ready: boolean) => void;
  setFavoriteServiceIds: (serviceIds: string[]) => void;
  setFavoriteSaved: (serviceId: string, saved: boolean) => void;
  setFavoritesReady: (ready: boolean) => void;
  resetFavorites: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  location: null,
  services: [],
  selectedCategory: null,
  user: null,
  authReady: false,
  favoriteServiceIds: [],
  favoritesReady: true,
  setLocation: (location) => set({ location }),
  setServices: (services) => set({ services }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),
  setFavoriteServiceIds: (favoriteServiceIds) => set({ favoriteServiceIds }),
  setFavoriteSaved: (serviceId, saved) =>
    set((state) => ({
      favoriteServiceIds: saved
        ? Array.from(new Set([...state.favoriteServiceIds, serviceId]))
        : state.favoriteServiceIds.filter((id) => id !== serviceId)
    })),
  setFavoritesReady: (favoritesReady) => set({ favoritesReady }),
  resetFavorites: () => set({ favoriteServiceIds: [], favoritesReady: true })
}));
