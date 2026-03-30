import { useEffect, useRef } from 'react';
import { toaster } from '@/lib/toaster';

/**
 * Detects browser auto-translation (Chrome, Safari, Edge, etc.) and shows
 * a warning toast.  Browser translation rewrites DOM text, which breaks
 * features like highlighted Arabizi words whose positions are tied to the
 * original string.
 *
 * Detection signals:
 * - Chrome/Edge: adds `class="translated-*"` to <html>
 * - Safari: adds `class="translated-*"` or a <meta name="translation-…"> tag
 * - All: may change the `lang` attribute on <html>
 */
export function useTranslationWarning() {
  const hasFired = useRef(false);

  useEffect(() => {
    const html = document.documentElement;

    function check() {
      if (hasFired.current) return;

      const isTranslated =
        html.classList.contains('translated-ltr') ||
        html.classList.contains('translated-rtl') ||
        html.getAttribute('translate') === 'yes' ||
        !!document.querySelector('meta[name^="translation"]');

      if (isTranslated) {
        hasFired.current = true;
        toaster.create({
          title: 'Browser translation detected',
          description:
            'Auto-translate may break highlighted words. Please disable translation for this site.',
          type: 'warning',
          duration: 10000,
        });
      }
    }

    // Check immediately (translation may already be active)
    check();

    // Watch for changes (translation applied after page load)
    const observer = new MutationObserver(check);
    observer.observe(html, {
      attributes: true,
      attributeFilter: ['class', 'lang', 'translate'],
      childList: true,
      subtree: false,
    });

    return () => observer.disconnect();
  }, []);
}
