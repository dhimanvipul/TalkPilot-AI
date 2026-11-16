import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, User, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#171819] ambient-bg flex items-center justify-center p-4 relative selection:bg-[#AD8A62]/30 selection:text-[#F1F0ED]">
      {/* Ambient reflections */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 bg-[#AD8A62]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-[#292B2D]/40 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#383A3C] via-[#292B2D] to-[#1C1E20] border border-[#AD8A62]/45 shadow-xl shadow-black/50 mb-2">
            <Sparkles className="w-6 h-6 text-[#C5A47E]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#F1F0ED] tracking-tight">
            TalkPilot <span className="text-[#C5A47E]">AI</span>
          </h1>
          <p className="text-xs text-[#A1A09B] font-medium tracking-wide">Create your enterprise account</p>
        </div>

        <div className="bg-[#1C1E20]/90 border border-[#AD8A62]/30 p-8 rounded-3xl shadow-2xl shadow-black/80 backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-[#F1F0ED]">Register</h2>
              <p className="text-xs text-[#8A8983]">Get started with automated AI calling</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#AD8A62] shadow-[0_0_8px_#AD8A62]" />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[#C05E54]/15 border border-[#C05E54]/30 text-[#E2847A] text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#C3C2BE] mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#8A8983] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-sm text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#C3C2BE] mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8A8983] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="rahul@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-sm text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#C3C2BE] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8A8983] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-sm text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#C3C2BE] mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8A8983] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-sm text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 btn-bronze text-sm font-bold rounded-xl shadow-bronze-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
              <ArrowRight className="w-4 h-4 text-[#121314]" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-[#8A8983]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#C5A47E] hover:text-[#F1F0ED] font-semibold underline underline-offset-2 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
