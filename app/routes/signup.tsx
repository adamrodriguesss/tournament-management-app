import { useState } from 'react';
import { NavLink, useNavigate, redirect } from 'react-router';
import { getSession, signup } from '../services/auth';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';

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
          <div className="p-4 bg-pixel-green/10 border-2 border-pixel-green-dim">
            <p className="text-pixel-green-dim font-[family-name:var(--font-pixel)] text-[10px] tracking-wide leading-relaxed">
              ✓ Registration successful! Please check your email to verify your account.
            </p>
          </div>
          <Button fullWidth onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  //signup.tsx
  return (
  <AuthLayout title="CREATE ACCOUNT" subtitle="Join University Event Management">
    <form onSubmit={handleSignUp} className="space-y-5">
      {error && (
        <div className="border-2 border-pixel-red bg-pixel-red/10 p-3 font-[family-name:var(--font-pixel)] text-[12px] text-pixel-red tracking-wide leading-relaxed">
          ⚠ {error}
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

        <Select
          label="Department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          required
          options={[
            { value: "", label: "Select your department" },
            ...[
              "IMBA","MBA","PHD (MANAGEMENT)","MCOM","MFS","PHD (COMMERCE)","MCA",
              "MSC DATA SCIENCE","MSC AI","PHD (COMPUTER SCIENCE)","M.A. HISTORY",
              "M.A. POLITICAL SCIENCE","M.A. SOCIOLOGY","MASTER OF LIBRARY AND INFORMATION SCIENCE",
              "M.A. INTERNATIONAL STUDIES","M.A. WOMEN'S STUDIES","M.A. PORTUGUESE",
              "M.A. HINDI","M.A. KONKANI","M.A. MARATHI","M.A. ENGLISH","M.A. FRENCH",
              "M.A. PHILOSOPHY","M.A. PUBLIC ADM.","M.A. ECONOMICS","B.A. COURSES",
              "MSW","LLM","PHD (ARTS)","M.SC. ANALYTICAL SCIENCE","M.SC. BIOCHEMISTRY",
              "M.SC. INORGANIC CHEMISTRY","M.SC. ORGANIC CHEMISTRY","M.SC. PHYSICAL CHEMISTRY",
              "M.SC. ELECTRONICS","M.SC. MATHEMATICS","M.SC. PHYSICS","PHD (ABOVE SUBJECTS)",
              "M.SC. MARINE BIOTECHNOLOGY","M.SC. GENERAL BIOTECHNOLOGY","M.SC. ZOOLOGY",
              "M.SC. MICROBIOLOGY","M.SC. BOTANY","M.SC. ENVIRONMENTAL SCIENCE",
              "M.SC. APPLIED GEOLOGY","M.SC. MARINE MICROBIOLOGY","M.SC. MARINE SCIENCES"
            ].map(dept => ({ value: dept, label: dept }))
          ]}
        />

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
        {loading ? 'CREATING ACCOUNT...' : 'SIGN UP'}
      </Button>

      <div className="text-center mt-6 border-t-2 border-pixel-border pt-5">
        <span className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate">
          Already have an account?{' '}
        </span>
        <NavLink
          to="/login"
          className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-gold hover:text-pixel-cyan transition-colors tracking-wide"
        >
          SIGN IN
        </NavLink>
      </div>
    </form>
  </AuthLayout>
);
}
