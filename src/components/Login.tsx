import { useState } from 'react';
import { Grid3X3, Smartphone, ArrowRight } from 'lucide-react';

const LOGIN_KEY = 'mindmap-login-phone';

export function isLoggedIn(): boolean {
  const phone = localStorage.getItem(LOGIN_KEY);
  return !!phone && /^\d{11}$/.test(phone);
}

export function logout() {
  localStorage.removeItem(LOGIN_KEY);
  window.location.reload();
}

export function Login() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const isValid = /^\d{11}$/.test(phone);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(value);
    setError('');
  };

  const handleLogin = () => {
    if (!isValid) {
      setError('请输入11位手机号码');
      return;
    }
    localStorage.setItem(LOGIN_KEY, phone);
    window.location.reload();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) {
      handleLogin();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-300/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        {/* 登录卡片 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30 mb-4">
              <Grid3X3 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">MindMap</h1>
            <p className="text-sm text-gray-500 mt-1">在线思维导图</p>
          </div>

          {/* 手机号输入 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                手机号码
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder="请输入11位手机号"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 text-lg tracking-widest bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 transition-all text-gray-800 placeholder:text-gray-400"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className={`text-xs font-medium ${phone.length === 11 ? 'text-green-500' : 'text-gray-400'}`}>
                    {phone.length}/11
                  </span>
                </div>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}
            </div>

            {/* 登录按钮 */}
            <button
              onClick={handleLogin}
              disabled={!isValid}
              className={`w-full py-3 px-4 rounded-xl text-white font-medium text-lg flex items-center justify-center gap-2 transition-all ${
                isValid
                  ? 'bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/30 active:scale-[0.98]'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              登录
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* 提示 */}
          <p className="mt-6 text-xs text-center text-gray-400 leading-relaxed">
            输入11位手机号码即可登录<br />
            登录状态会自动保存，下次无需重复输入
          </p>
        </div>
      </div>
    </div>
  );
}
