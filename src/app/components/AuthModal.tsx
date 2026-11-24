import { useApp } from "../../context/AppContext";

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ onClose, onSuccess }: Props) {
  const { login } = useApp();

  function handleGoogle() {
    // Starts the real Google sign-in redirect; the page navigates away and
    // returns signed in, so onSuccess is intentionally not called here.
    login();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#ADB5BD] hover:text-[#495057] transition-colors"
        >
          <svg className="size-5" fill="none" viewBox="0 0 20 20">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Content */}
        <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-5 text-center">
          {/* Logo */}
          <div className="size-16 rounded-2xl bg-[#E5F5F4] flex items-center justify-center">
            <svg className="size-9" fill="none" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="13" fill="url(#am-g1)" fillOpacity="0.3" />
              <circle cx="16" cy="16" r="13" stroke="url(#am-g2)" strokeWidth="2" />
              <ellipse cx="16" cy="10" fill="url(#am-g3)" fillOpacity="0.5" rx="6" ry="3.5" />
              <defs>
                <linearGradient id="am-g1" x1="16" x2="16" y1="3" y2="29" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00a79d" /><stop offset="1" stopColor="#008f86" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="am-g2" x1="3" x2="29" y1="16" y2="16" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00a79d" /><stop offset="1" stopColor="#008f86" />
                </linearGradient>
                <linearGradient id="am-g3" x1="16" x2="16" y1="6" y2="14" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div>
            <h2 className="font-bold text-[20px] text-[#212529] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Welcome to WE Bubbles
            </h2>
            <p className="text-[14px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
              Sign in to join Bubbles, track your progress, and connect with your learning community.
            </p>
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[#E9ECEF] hover:bg-[#F8F9FA] hover:border-[#DEE2E6] transition-all text-[14px] font-medium text-[#212529]"
            style={{ fontFamily: 'var(--font-body)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <svg className="size-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <p className="text-[12px] text-[#ADB5BD]" style={{ fontFamily: 'var(--font-body)' }}>
            We only use Google to verify your identity.
          </p>
        </div>
      </div>
    </div>
  );
}
