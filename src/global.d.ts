export {};

declare global {
  interface Window {
    turnstile?: {
      render(selector: string, options: Record<string, unknown>): string | number;
      reset(widgetId: string | number): void;
      remove(widgetId: string | number): void;
    };
    ClipboardItem?: typeof ClipboardItem;
  }
}
