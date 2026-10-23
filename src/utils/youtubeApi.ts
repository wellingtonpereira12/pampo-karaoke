// ==========================================================================
// PAMPO KARAOKE - YOUTUBE IFRAME API LOADER (BASEADO NO ASSISTIR JUNTOS FAKEDC)
// ==========================================================================

let isYtApiReady = false;
let ytApiPromise: Promise<void> | null = null;

export function ensureYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  // If already loaded and ready
  if (isYtApiReady && (window as any).YT && (window as any).YT.Player) {
    return Promise.resolve();
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve) => {
    if ((window as any).YT && (window as any).YT.Player) {
      isYtApiReady = true;
      return resolve();
    }

    const oldCallback = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      isYtApiReady = true;
      if (typeof oldCallback === 'function') {
        try { oldCallback(); } catch (e) {}
      }
      resolve();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(tag, firstScript);
      } else {
        document.head.appendChild(tag);
      }
    }
  });

  return ytApiPromise;
}
