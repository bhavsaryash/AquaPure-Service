/** Load Razorpay checkout.js once (handles slow network vs index.html tag). */
export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve();

  const src = 'https://checkout.razorpay.com/v1/checkout.js';
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')), { once: true });
      if ((window as unknown as { Razorpay?: unknown }).Razorpay) resolve();
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay script'));
    document.body.appendChild(s);
  });
}
