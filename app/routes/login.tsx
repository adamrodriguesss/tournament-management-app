import { useState } from 'react';
import { NavLink, useNavigate, redirect } from 'react-router';
import { supabase } from '../lib/supabase';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export async function clientLoader() {
  const { data: { session } } = await supabase.auth.getSession();
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
    
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your account">
      <form onSubmit={handleLogin} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-500">
            {error}
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
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
        
        <div className="text-center mt-6">
          <span className="text-slate-400 text-sm">Don't have an account? </span>
          <NavLink to="/signup" className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium">
            Sign up
          </NavLink>
        </div>
      </form>
    </AuthLayout>
  );
}
