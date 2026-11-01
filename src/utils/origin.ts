declare global {
  interface Window {
    Origin?: {
      from(value: unknown): {
        isSameOrigin(other: unknown): boolean;
        isSameSite(other: unknown): boolean;
      };
    };
  }
}

export function isSameOriginEvent(event: MessageEvent): boolean {
  try {
    if (typeof window !== 'undefined' && 'Origin' in window && window.Origin) {
      return window.Origin.from(event).isSameOrigin(window.Origin.from(window.self));
    }
    if (!event.origin || event.origin === 'null') return false;
    return new URL(event.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}
