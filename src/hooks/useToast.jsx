import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, variant = 'info') => {
    clearTimeout(timerRef.current);
    setToast({ message, variant, key: Date.now() });
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[500] flex flex-col gap-2"
      >
        {toast && (
          <div
            key={toast.key}
            role="status"
            className={`animate-slide-up pointer-events-auto max-w-xs rounded-md border-l-4 bg-ink-800 px-4 py-3 text-sm font-medium shadow-lg shadow-black/40 ${
              toast.variant === 'error'
                ? 'border-blood-500 text-blood-500'
                : toast.variant === 'success'
                ? 'border-rift-500 text-white'
                : 'border-ember-500 text-white'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
