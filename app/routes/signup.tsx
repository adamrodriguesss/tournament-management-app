import { useState } from 'react';
import { NavLink, useNavigate, redirect } from 'react-router';
import { getSession, signup } from '../services/auth';
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

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();


  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error: authError } = await signup(email, password, {
      full_name: fullName,
      department,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent a confirmation link">
        <div className="text-center space-y-6">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg">
            <p className="text-emerald-500 font-medium">
              Registration successful! Please check your email to verify your account.
            </p>
          </div>
          <Button fullWidth onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create Account" subtitle="Join University Event Management">
      <form onSubmit={handleSignUp} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-500">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <Input 
            label="Full Name" 
            type="text" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)}
            required 
            placeholder="John Doe"
          />
          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-[14px] font-medium text-slate-400 uppercase tracking-wide">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <option value="" disabled>Select your department</option>
              {["IMBA","MBA","PHD (MANAGEMENT)","MCOM","MFS","PHD (COMMERCE)","MCA","MSC DATA SCIENCE","MSC AI","PHD (COMPUTER SCIENCE)","M.A. HISTORY","M.A. POLITICAL SCIENCE","M.A. SOCIOLOGY","MASTER OF LIBRARY AND INFORMATION SCIENCE","M.A. INTERNATIONAL STUDIES","M.A. WOMEN'S STUDIES","M.A. PORTUGUESE","M.A. HINDI","M.A. KONKANI","M.A. MARATHI","M.A. ENGLISH","M.A. FRENCH","M.A. PHILOSOPHY","M.A. PUBLIC ADM.","M.A. ECONOMICS","B.A. COURSES","MSW","LLM","PHD (ARTS)","M.SC. ANALYTICAL SCIENCE","M.SC. BIOCHEMISTRY","M.SC. INORGANIC CHEMISTRY","M.SC. ORGANIC CHEMISTRY","M.SC. PHYSICAL CHEMISTRY","M.SC. ELECTRONICS","M.SC. MATHEMATICS","M.SC. PHYSICS","PHD (ABOVE SUBJECTS)","M.SC. MARINE BIOTECHNOLOGY","M.SC. GENERAL BIOTECHNOLOGY","M.SC. ZOOLOGY","M.SC. MICROBIOLOGY","M.SC. BOTANY","M.SC. ENVIRONMENTAL SCIENCE","M.SC. APPLIED GEOLOGY","M.SC. MARINE MICROBIOLOGY","M.SC. MARINE SCIENCES"].map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
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
            minLength={6}
          />
        </div>
        
        <Button fullWidth type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </Button>
        
        <div className="text-center mt-6">
          <span className="text-slate-400 text-sm">Already have an account? </span>
          <NavLink to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium">
            Sign in
          </NavLink>
        </div>
      </form>
    </AuthLayout>
  );
}
