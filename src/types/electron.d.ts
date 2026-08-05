export {};

declare global {
  interface Window {
    electronPet?: {
      setPosition: (x: number, y: number) => Promise<void>;
      getPosition: () => Promise<{ x: number; y: number } | null>;
      getWindowPos: () => Promise<{ x: number; y: number } | null>;
      resize: (w: number, h: number) => Promise<void>;
      moveWindow: (x: number, y: number) => void;
      moveDelta: (dx: number, dy: number) => void;
      platform: string;
    };
    electronApp?: {
      platform: string;
      isElectron: boolean;
      showPet: () => void;
      hidePet: () => void;
      isPetVisible: () => Promise<boolean>;
    };
  }
}
