/* Local declaration smoothing -- the @nac3/runtime package ships its
   own d.ts but this file gives us strict access to window.NAC and
   window.NacChat from anywhere in the app without explicit imports. */

declare global {
  interface Window {
    NAC?: any;
    NACv2?: any;
    NacChat?: any;
  }
}

export {};
