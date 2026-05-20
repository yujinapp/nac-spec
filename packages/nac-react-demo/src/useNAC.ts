import { useEffect, useRef } from 'react';

/* React hooks that wrap the NAC v2.3 runtime in idiomatic shape.
   These will ship as part of @nac3/runtime/react in a future release;
   for now we inline them here so the study case is self-contained. */

/** Register a manifest once, on mount. */
export function useNACManifest(manifest: any) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(manifest);
  }, [manifest.plugin_slug]);
}

/** Auto-emit nac:action:succeeded after a click handler fires.
 *  Returns a ref to attach to the element. The handler runs first
 *  (the React onClick), then the v2.2 contract event is dispatched. */
export function useNACAction(plugin: string, action_id: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClick = () => {
      queueMicrotask(() => {
        document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
          detail: { plugin, action_id }
        }));
      });
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [plugin, action_id]);
  return ref;
}

/** Wire the chat client (NacChat.init) once, after the DOM nodes
 *  it references are mounted. */
export function useNacChat(opts: {
  endpoint: string;
  chatLogId: string;
  inputId: string;
  sendBtnId: string;
  langSelectId?: string;
  micBtnId?: string;
  handsFreeBtnId?: string;
  ttsBtnId?: string;
  lang?: string;
}) {
  useEffect(() => {
    if (!window.NacChat) return;
    const elt = (id?: string) => id ? document.getElementById(id) : null;
    window.NacChat.init({
      endpoint:     opts.endpoint,
      lang:         opts.lang || 'en',
      chatLog:      elt(opts.chatLogId),
      input:        elt(opts.inputId),
      sendBtn:      elt(opts.sendBtnId),
      langSelect:   elt(opts.langSelectId),
      micBtn:       elt(opts.micBtnId),
      handsFreeBtn: elt(opts.handsFreeBtnId),
      ttsBtn:       elt(opts.ttsBtnId)
    });
  }, []);
}

/** Run an autopilot script that walks the user through a sequence
 *  of NAC ids, narrating each via TTS. Returns {start, stop}. */
export function useAutopilot(steps: Array<{ id: string; narrate: string }>) {
  const runningRef = useRef(false);
  const abortRef   = useRef(false);

  const start = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    abortRef.current   = false;

    const onAbort = () => { abortRef.current = true; };
    window.addEventListener('keydown',   onAbort, { once: true });
    window.addEventListener('mousedown', onAbort, { once: true });

    for (const step of steps) {
      if (abortRef.current) break;
      const el = document.querySelector(`[data-nac-id="${step.id}"]`) as HTMLElement | null;
      if (!el) continue;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.setAttribute('data-autopilot', 'active');
      try { window.NacChat?.botSpeak?.(step.narrate); } catch {}
      await new Promise(r => setTimeout(r, 3500));
      el.removeAttribute('data-autopilot');
    }

    runningRef.current = false;
    window.removeEventListener('keydown',   onAbort);
    window.removeEventListener('mousedown', onAbort);
  };

  const stop = () => { abortRef.current = true; };

  return { start, stop };
}
