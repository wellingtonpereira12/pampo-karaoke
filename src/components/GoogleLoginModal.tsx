import React, { useState, useEffect } from 'react';
import { X, Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Reset errors on open
  useEffect(() => {
    if (isOpen) {
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Por favor, informe seu e-mail do Google (Gmail).');
      return;
    }

    if (!cleanEmail.endsWith('@gmail.com') && !cleanEmail.includes('@googlemail.com')) {
      setError('Apenas contas Google Gmail (@gmail.com) são permitidas para login.');
      return;
    }

    const computedName = name.trim() || cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = computedName.charAt(0).toUpperCase() + computedName.slice(1);
    
    // Nice Google-style DiceBear / Initials Avatar
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}&backgroundColor=0f172a`;

    login({
      id: `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '')}`,
      name: formattedName,
      email: cleanEmail,
      avatar,
    });
    onClose();
  };

  const handleQuickDemo = (sampleEmail: string, sampleName: string) => {
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(sampleEmail)}&backgroundColor=0f172a`;
    login({
      id: `usr-${sampleEmail.replace(/[^a-zA-Z0-9]/g, '')}`,
      name: sampleName,
      email: sampleEmail,
      avatar,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-[#131722] border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center p-3 shadow-lg mb-3">
            {/* Official Google 'G' SVG Logo */}
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
          <h3 className="text-xl font-bold text-white tracking-tight">Login com Google</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Acesse com seu e-mail do Gmail para cantar ao vivo com seus amigos nas salas online
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Gmail Form */}
        <form onSubmit={handleGoogleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
              Seu E-mail do Google (Gmail)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seunome@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-500 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
              Seu Nome de Cantor(a) <span className="text-slate-500 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Como quer ser chamado(a) na sala"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-500 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4">
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
            <span>Continuar com o Google</span>
          </button>
        </form>

        {/* Quick Demo Google Accounts */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">
            Ou escolha um perfil rápido para testar:
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleQuickDemo('cantor.disco@gmail.com', 'Lucas Voz de Ouro')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              Lucas (Gmail)
            </button>
            <button
              onClick={() => handleQuickDemo('marina.karaoke@gmail.com', 'Marina Melodia')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3 text-pink-400" />
              Marina (Gmail)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
