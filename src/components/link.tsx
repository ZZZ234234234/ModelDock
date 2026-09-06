'use client';
import { forwardRef, useSyncExternalStore, type AnchorHTMLAttributes } from 'react';
const subscribe = (notify: () => void) => {
  window.addEventListener('popstate', notify);
  return () => window.removeEventListener('popstate', notify);
};
const snapshot = () => window.location.pathname + window.location.search;
/** Local workspace navigation keeps session keys and app state in memory.
 * Direct visits still resolve through the server's application routes. */
export function useLocation() {
  return useSyncExternalStore(subscribe, snapshot, () => '/');
}
export function usePathname() {
  return useLocation().split('?')[0];
}
export function useSearchParams() {
  return new URLSearchParams(useLocation().split('?')[1] ?? '');
}
const Link = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
>(function Link({ href, onClick, children, ...props }, ref) {
  return (
    <a
      {...props}
      ref={ref}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === '_blank' ||
          !href.startsWith('/') ||
          href.startsWith('//')
        )
          return;
        event.preventDefault();
        if (window.location.pathname + window.location.search === href) return;
        window.history.pushState(null, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
        window.scrollTo({ top: 0, behavior: 'instant' });
      }}
    >
      {children}
    </a>
  );
});
export default Link;
