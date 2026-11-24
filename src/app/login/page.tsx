'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInventory } from '@/lib/store/inventory-store';
import {
  Boxes,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Warehouse,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, allUsers } = useInventory();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Mohon isi email dan password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      router.push('/');
    } else {
      setErrorMsg(result.message || 'Gagal masuk. Periksa kembali email dan password.');
    }
  };

  const handleQuickRoleSelect = async (userEmail: string, defaultPass: string) => {
    setEmail(userEmail);
    setPassword(defaultPass);
    setIsLoading(true);
    setErrorMsg(null);

    const result = await login(userEmail, defaultPass);
    setIsLoading(false);

    if (result.success) {
      router.push('/');
    } else {
      setErrorMsg(result.message || 'Gagal masuk dengan peran demo.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-6 antialiased font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shadow-xs mb-1">
            <Boxes className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            NexStock <span className="font-normal text-slate-500">WMS</span>
          </h1>
          <p className="text-xs text-slate-500">
            Sistem Manajemen Pergudangan & Logistik Internal Enterprise
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Masuk ke Akun Anda
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Masukkan kredensial yang terdaftar di Supabase Auth.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Email Perusahaan
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@nexstock.com"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[11px] text-slate-400">Min. 6 karakter</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-9 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition shadow-2xs active:scale-[0.99]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Dasbor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Picker (1-Click Switch) */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Pilih Peran Demo Cepat (1-Click)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Instan</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {allUsers.slice(0, 3).map((u) => {
                const pass =
                  u.role === 'SUPER_ADMIN'
                    ? 'Admin123!'
                    : u.role === 'WAREHOUSE_LEAD'
                    ? 'Lead123!'
                    : 'Staff123!';

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickRoleSelect(u.email || '', pass)}
                    disabled={isLoading}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {u.avatarInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 truncate leading-none">
                          {u.fullName}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-indigo-600 font-medium">{u.email}</span>
                          <span>•</span>
                          <span>
                            {u.role === 'SUPER_ADMIN'
                              ? 'Super Admin (HQ)'
                              : u.role === 'WAREHOUSE_LEAD'
                              ? 'Lead (Jakarta)'
                              : 'Staff (Packing)'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 group-hover:text-indigo-600 shrink-0">
                      Pilih &rarr;
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Dilindungi oleh Supabase Auth & PostgreSQL Row-Level Security</span>
        </div>
      </div>
    </div>
  );
}
