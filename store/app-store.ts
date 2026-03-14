"use client";

import { create } from "zustand";
import type { LocationContext, ServiceCategory, ServiceWithMeta, SessionUser } from "@/lib/types";

type AppState = {
  location: LocationContext | null;
  services: ServiceWithMeta[];
  selectedCategory: ServiceCategory | null;
  user: SessionUser | null;
  authReady: boolean;
  setLocation: (location: LocationContext | null) => void;
  setServices: (services: ServiceWithMeta[]) => void;
  setSelectedCategory: (category: ServiceCategory | null) => void;
  setUser: (user: SessionUser | null) => void;
  setAuthReady: (ready: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  location: null,
  services: [],
  selectedCategory: null,
  user: null,
  authReady: false,
  setLocation: (location) => set({ location }),
  setServices: (services) => set({ services }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady })
}));

