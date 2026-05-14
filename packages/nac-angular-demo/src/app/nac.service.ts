import { Injectable } from '@angular/core';

declare global {
  interface Window { NAC?: any; NacChat?: any; }
}

/* Thin wrapper around the global NAC + NacChat objects.
   Lets components inject NacService instead of touching window. */
@Injectable({ providedIn: 'root' })
export class NacService {
  get NAC()       { return window.NAC; }
  get NacChat()   { return window.NacChat; }

  register(manifest: any) { this.NAC?.register(manifest); }
  click(id: string)        { return this.NAC?.click(id); }
  fill(id: string, v: any) { return this.NAC?.fill(id, v); }

  bindAction(el: HTMLElement, handler: (ev: Event) => void | Promise<unknown>,
             ctx: { plugin: string; action_id: string }) {
    return this.NAC?.bindAction(el, handler, ctx);
  }

  initChat(opts: any) { this.NacChat?.init(opts); }
  onChatAction(kind: string, fn: (a: any) => any) { this.NacChat?.onAction(kind, fn); }
  botSpeak(text: string) { this.NacChat?.botSpeak(text); }
}
