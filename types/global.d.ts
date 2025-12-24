// types/global.d.ts
export {};

declare global {
  interface Window {
    __auth_user__?: any;
    __auth_setUser__?: (value: any) => void;
  }
}
