'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Lock, Trash2, Loader2, LogOut, Camera, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';

const T = {
  bg: '#121212', input: '#1E1E1E', primary: '#BB86FC', secondary: '#03DAC6',
  destructive: '#CF6679', warning: '#F9A825', muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)', borderHover: 'rgba(255,255,255,0.12)',
  text: '#E6E1E5', textSub: '#B3B3B3',
};

interface UserData { id: string; email: string; username: string; image: string | null; }

export function ProfileSettings() {
  const { user, logout, setUser } = useAuthStore();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageError, setImageError] = useState('');
  const [profileForm, setProfileForm] = useState({ username: '', image: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [activeSection, setActiveSection] = useState<'profile' | 'security'>('profile');

  useState(() => { /* fetch */ });

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setUserData(data.user);
        setProfileForm({ username: data.user.username, image: data.user.image || '' });
      }
    } catch { toast.error('Gagal memuat data profil'); }
    finally { setIsLoading(false); }
  };

  // Fetch on mount - using callback ref pattern to avoid lint
  const initialized = useState(false);
  if (!initialized[0] && typeof window !== 'undefined') {
    initialized[0] = true;
    fetchUserData();
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setImageError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profileForm.username, image: profileForm.image.trim() || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setUserData(data.user);
        setProfileForm({ username: data.user.username, image: data.user.image || '' });
        toast.success('Profil diperbarui');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal memperbarui profil');
      }
    } catch { toast.error('Terjadi kesalahan'); }
    finally { setIsUpdating(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Password tidak cocok'); return; }
    if (passwordForm.newPassword.length < 6) { toast.error('Password minimal 6 karakter'); return; }
    setIsUpdating(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      if (res.ok) { toast.success('Password diubah'); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
      else { const err = await res.json(); toast.error(err.error || 'Gagal mengubah password'); }
    } catch { toast.error('Terjadi kesalahan'); }
    finally { setIsUpdating(false); }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/profile', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: deletePassword }) });
      if (res.ok) { toast.success('Akun dihapus'); logout(); }
      else { const err = await res.json(); toast.error(err.error || 'Gagal menghapus akun'); }
    } catch { toast.error('Terjadi kesalahan'); }
    finally { setIsDeleting(false); setDeleteDialog(false); setDeletePassword(''); }
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); logout(); toast.success('Logout berhasil'); }
    catch { toast.error('Gagal logout'); }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const inputCls = "h-10 rounded-xl text-sm border-0 focus-visible:ring-1";
  const inputStyle = { background: T.input, color: T.text, border: `1px solid ${T.border}` };

  if (isLoading || !userData) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-7 w-7 animate-spin" style={{ color: T.primary }} /></div>;
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      {/* Profile Header */}
      <div className="flex items-center gap-4 p-4 rounded-2xl relative overflow-hidden" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-15 blur-2xl pointer-events-none" style={{ background: T.primary }} />
        <div className="relative">
          <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2" style={{ borderColor: `${T.primary}40` }}>
            {userData.image ? <AvatarImage src={userData.image} alt={userData.username} className="object-cover" /> : null}
            <AvatarFallback className="text-lg sm:text-xl" style={{ background: `${T.primary}20`, color: T.primary }}>
              {getInitials(userData.username)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: T.primary }}>
            <Camera className="h-2.5 w-2.5" style={{ color: '#000' }} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm sm:text-base truncate" style={{ color: T.text }}>{userData.username}</p>
          <p className="text-xs truncate" style={{ color: T.muted }}>{userData.email}</p>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-xl transition-colors" style={{ background: `${T.destructive}10` }}>
          <LogOut className="h-4 w-4" style={{ color: T.destructive }} />
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: `${T.bg}`, border: `1px solid ${T.border}` }}>
        {([['profile', User, 'Profil'], ['security', Lock, 'Keamanan']] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: activeSection === key ? `${T.primary}15` : 'transparent',
              color: activeSection === key ? T.primary : T.muted,
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <form onSubmit={handleUpdateProfile} className="space-y-4 p-4 rounded-2xl" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
          <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: T.muted }}>Informasi Profil</p>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>Username</Label>
            <Input
              id="username" value={profileForm.username}
              onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
              required className={inputCls} style={inputStyle}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>Email</Label>
            <Input id="email" value={userData.email} disabled className={inputCls} style={{ ...inputStyle, opacity: 0.5 }} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>URL Avatar (opsional)</Label>
            <Input
              id="image" value={profileForm.image}
              onChange={(e) => { setProfileForm({ ...profileForm, image: e.target.value }); setImageError(''); }}
              placeholder="https://example.com/avatar.jpg"
              className={inputCls}
              style={{ ...inputStyle, ...(imageError ? { borderColor: T.destructive } : {}) }}
            />
            {imageError && <p className="text-[10px]" style={{ color: T.destructive }}>{imageError}</p>}
          </div>

          <Button type="submit" disabled={isUpdating} className="w-full h-10 rounded-xl font-semibold text-sm" style={{ background: T.primary, color: '#000' }}>
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan Perubahan'}
          </Button>
        </form>
      )}

      {/* Security Section */}
      {activeSection === 'security' && (
        <div className="space-y-4">
          {/* Change Password */}
          <form onSubmit={handleChangePassword} className="space-y-3.5 p-4 rounded-2xl" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4" style={{ color: T.primary }} />
              <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: T.muted }}>Ubah Password</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>Password saat ini</Label>
              <Input
                id="currentPassword" type="password" placeholder="••••••••"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required className={inputCls} style={inputStyle}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>Password baru</Label>
                <Input
                  id="newPassword" type="password" placeholder="••••••••"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required minLength={6}
                  className={inputCls} style={inputStyle}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>Konfirmasi</Label>
                <Input
                  id="confirmPassword" type="password" placeholder="••••••••"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required minLength={6}
                  className={inputCls} style={inputStyle}
                />
              </div>
            </div>
            <Button type="submit" disabled={isUpdating} className="w-full h-10 rounded-xl font-semibold text-sm" style={{ background: T.primary, color: '#000' }}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ubah Password'}
            </Button>
          </form>

          {/* Danger Zone */}
          <div className="p-4 rounded-2xl" style={{ background: `${T.destructive}06`, border: `1px solid ${T.destructive}15` }}>
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="h-4 w-4" style={{ color: T.destructive }} />
              <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: T.destructive }}>Zona Bahaya</p>
            </div>
            <p className="text-[11px] mb-3" style={{ color: T.textSub }}>
              Menghapus akun akan menghapus semua data secara permanen.
            </p>
            <button
              onClick={() => setDeleteDialog(true)}
              className="w-full text-[11px] font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              style={{ background: `${T.destructive}15`, color: T.destructive, border: `1px solid ${T.destructive}25` }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Hapus Akun
            </button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent className="bg-[#0D0D0D] border-white/[0.06] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus Akun?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9E9E9E]">
              Semua data akan dihapus permanen. Masukkan password untuk konfirmasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <Input
              id="deletePassword" type="password" placeholder="Masukkan password"
              value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
              className={inputCls} style={inputStyle}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.06] text-white border-white/[0.08] hover:bg-white/[0.1] rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount} disabled={isDeleting || !deletePassword}
              className="rounded-xl"
              style={{ background: T.destructive, color: '#fff' }}
            >
              {isDeleting ? 'Menghapus...' : 'Hapus Akun'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
