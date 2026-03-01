import { create } from 'zustand';

interface GameState {
  playerLocation: { lat: number, lng: number };
  playerHeading: number; // 0 is North, 90 is East
  playerMode: 'walking' | 'driving';
  carLocation: { lat: number, lng: number };
  carHeading: number;
  missionStep: number;
  packagePickedUp: boolean;
  packageDelivered: boolean;
  
  setPlayerLocation: (loc: { lat: number, lng: number }) => void;
  setPlayerHeading: (heading: number) => void;
  setPlayerMode: (mode: 'walking' | 'driving') => void;
  setCarLocation: (loc: { lat: number, lng: number }) => void;
  setCarHeading: (heading: number) => void;
  setMissionStep: (step: number) => void;
  setPackagePickedUp: (pickedUp: boolean) => void;
  setPackageDelivered: (delivered: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  playerLocation: { lat: 30.1765, lng: -85.7725 },
  playerHeading: 0,
  playerMode: 'walking',
  carLocation: { lat: 30.1766, lng: -85.7725 }, // Slightly north
  carHeading: 0,
  missionStep: 0,
  packagePickedUp: false,
  packageDelivered: false,
  
  setPlayerLocation: (loc) => set({ playerLocation: loc }),
  setPlayerHeading: (heading) => set({ playerHeading: heading }),
  setPlayerMode: (mode) => set({ playerMode: mode }),
  setCarLocation: (loc) => set({ carLocation: loc }),
  setCarHeading: (heading) => set({ carHeading: heading }),
  setMissionStep: (step) => set({ missionStep: step }),
  setPackagePickedUp: (pickedUp) => set({ packagePickedUp: pickedUp }),
  setPackageDelivered: (delivered) => set({ packageDelivered: delivered }),
}));
