import { useState } from 'react';
import { NavLink, useNavigate, redirect } from 'react-router';
import { getSession, login } from '../services/auth';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export async function clientLoader() {
  const session = await getSession();
  if (session) {
    return redirect("/");
  }
  return null;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error: authError } = await login(email, password);

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <AuthLayout title="WELCOME BACK" subtitle="Insert coin to continue">
  <form onSubmit={handleLogin} className="space-y-5">
    {error && (
      <div className="border-2 border-red-500 bg-red-500/10 p-3 font-['Press_Start_2P'] text-[10px] text-red-500 tracking-wide leading-relaxed">
        ⚠ {error}
      </div>
    )}

    <div className="space-y-4">
      <Input
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="you@university.edu"
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        placeholder="••••••••"
      />
    </div>

    <Button fullWidth type="submit" disabled={loading}>
      {loading ? 'LOADING...' : 'SIGN IN'}
    </Button>

    <div className="text-center mt-6 border-t-2 border-[#0f3460] pt-5">
      <span className="text-[#8892b0] font-['VT323'] text-lg">Don't have an account? </span>
      <NavLink
        to="/signup"
        className="font-['Press_Start_2P'] text-[10px] text-[#e2b714] hover:text-[#00f5ff] transition-colors tracking-wide"
      >
        SIGN UP
      </NavLink>
    </div>
  </form>
</AuthLayout>
  );
}
