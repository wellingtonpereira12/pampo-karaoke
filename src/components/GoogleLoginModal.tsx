import React, { useState, useEffect } from 'react';
import { X, ExternalLink, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GOOGLE_CLIENT_ID = '654271803391-jh9fuvsv9ime18m5oljj92oo1e5nlr57.apps.googleusercontent.com';

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setLoading(false);

    // 1. Initialize Google Identity Services (GIS) directly in browser using javascript_origins
    const initGsi = () => {
      const g = (window as unknown as { google?: { accounts?: { id?: {
        initialize: (cfg: unknown) => void;
        renderButton: (el: HTMLElement, opts: unknown) => void;
      } } } }).google;

      if (g?.accounts?.id) {
        g.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: { credential?: string }) => {
            if (response?.credential) {
              try {
                const base64Url = response.credential.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split('')
                    .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                );
                const decoded = JSON.parse(jsonPayload);
                login({
                  id: `google-${decoded.sub || Math.random().toString(36).substr(2, 9)}`,
                  name: decoded.name || decoded.email?.split('@')[0] || 'Cantor Google',
                  email: (decoded.email || '').toLowerCase(),
                  avatar: decoded.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(decoded.email || 'user')}`,
                });
                onClose();
              } catch (err) {
                console.error('Failed to parse Google credential token:', err);
              }
            }
          },
        });

        const btnContainer = document.getElementById('googleSignInOfficialBtn');
        if (btnContainer) {
          btnContainer.innerHTML = '';
          g.accounts.id.renderButton(btnContainer, {
            type: 'standard',
            theme: 'filled_blue',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 280,
          });
        }
      }
    };

    initGsi();
    const timer = setTimeout(initGsi, 700);

    // 2. Listen for postMessage from the official Google OAuth popup (fallback flow)
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' && event.data.user) {
        login(event.data.user);
        setLoading(false);
        onClose();
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setErrorMsg('Erro retornado pelo Google: ' + (event.data.error || 'Autenticação não concluída'));
        setLoading(false);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', handleAuthMessage);
    };
  }, [isOpen, login, onClose]);

  if (!isOpen) return null;

  const handleLaunchGooglePopup = () => {
    setLoading(true);
    setErrorMsg('');

    const width = 520;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      '/api/auth/google',
      'google_auth_window',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=yes,status=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.href = '/api/auth/google';
    }
  };

  const handleDirectRedirect = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-[#131722] border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 text-center"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Google Official G Logo */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-white flex items-center justify-center p-3.5 shadow-xl mb-4">
          <svg viewBox="0 0 24 24" className="w-full h-full">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.43 7.35 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight">
          Login Oficial do Google
        </h3>
        <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
          Escolha sua conta oficial do Google para acessar salas online e cantar junto.
        </p>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col items-center gap-3 w-full">
          {/* Official Google Identity Services One-Click Button (Uses javascript_origins, no redirect_uri needed!) */}
          <div id="googleSignInOfficialBtn" className="min-h-[44px] flex items-center justify-center w-full" />

          {/* Backup Button: Direct OAuth Popup */}
          <button
            onClick={handleLaunchGooglePopup}
            disabled={loading}
            className="w-full py-3 px-4 rounded-full bg-slate-900/90 hover:bg-slate-800 active:scale-[0.99] text-slate-200 text-xs font-semibold shadow-lg flex items-center justify-center gap-2.5 transition border border-slate-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>Aguardando resposta do Google...</span>
              </>
            ) : (
              <span>Entrar via Janela Popup do Google</span>
            )}
          </button>

          {/* Alternative direct redirect option */}
          <button
            onClick={handleDirectRedirect}
            className="text-[11px] text-slate-500 hover:text-cyan-400 flex items-center justify-center gap-1 transition pt-1"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Abrir tela inteira</span>
          </button>
        </div>

        {/* Security badge */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Autenticado com segurança pelo Google Accounts</span>
        </div>
      </div>
    </div>
  );
};
