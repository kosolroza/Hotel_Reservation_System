import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { toast } from '../../components/ui/toast';

const profileSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  passport_number: z.string().optional(),
});

const pwSchema = z.object({
  current_password: z.string().min(1, 'Required'),
  new_password: z.string().min(8, 'Min 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match', path: ['confirm_password'],
});

type ProfileData = z.infer<typeof profileSchema>;
type PwData = z.infer<typeof pwSchema>;

export default function MyProfile() {
  const { user, updateUser } = useAuthStore();

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      address: user?.address || '',
      nationality: user?.nationality || '',
      gender: user?.gender,
      passport_number: user?.passport_number || '',
    },
  });

  const pwForm = useForm<PwData>({ resolver: zodResolver(pwSchema) });

  // ✅ useEffect INSIDE the component
  useEffect(() => {
    if (user) {
      profileForm.reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        address: user.address || '',
        nationality: user.nationality || '',
        gender: user.gender,
        passport_number: user.passport_number || '',
      });
    }
  }, [user]);

  async function onProfileSave(data: ProfileData) {
    try {
      const updated = await authService.updateMe(data);
      updateUser(updated);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile.');
    }
  }

  async function onPasswordChange(data: PwData) {
    try {
      await authService.changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast.success('Password changed!');
      pwForm.reset();
    } catch {
      toast.error('Incorrect current password.');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-navy">My Profile</h1>

      {/* Profile Info */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="font-semibold text-navy mb-4">Personal Information</h2>
        <form onSubmit={profileForm.handleSubmit(onProfileSave)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input {...profileForm.register('first_name')} className="mt-1" />
              {profileForm.formState.errors.first_name && (
                <p className="text-red-500 text-xs mt-1">{profileForm.formState.errors.first_name.message}</p>
              )}
            </div>
            <div>
              <Label>Last Name</Label>
              <Input {...profileForm.register('last_name')} className="mt-1" />
            </div>
            <div>
              <Label>Email (read-only)</Label>
              <Input value={user?.email || ''} readOnly className="mt-1 bg-gray-50 cursor-not-allowed" />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input {...profileForm.register('phone')} className="mt-1" placeholder="+855 12 345 678" />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input {...profileForm.register('address')} className="mt-1" placeholder="Your address" />
            </div>
            <div>
              <Label>Nationality</Label>
              <Input {...profileForm.register('nationality')} className="mt-1" placeholder="e.g. Cambodian" />
            </div>
            <div>
              <Label>Gender</Label>
              <select
                {...profileForm.register('gender')}
                className="mt-1 w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label>Passport / ID Number</Label>
              <Input {...profileForm.register('passport_number')} className="mt-1" placeholder="AB1234567" />
            </div>
          </div>
          <Button type="submit" disabled={profileForm.formState.isSubmitting}>
            {profileForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="font-semibold text-navy mb-4">Change Password</h2>
        <form onSubmit={pwForm.handleSubmit(onPasswordChange)} className="space-y-4 max-w-md">
          {(['current_password', 'new_password', 'confirm_password'] as const).map(field => (
            <div key={field}>
              <Label>{field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Label>
              <Input type="password" {...pwForm.register(field)} className="mt-1" />
              {pwForm.formState.errors[field] && (
                <p className="text-red-500 text-xs mt-1">{pwForm.formState.errors[field]?.message}</p>
              )}
            </div>
          ))}
          <Button type="submit" disabled={pwForm.formState.isSubmitting}>
            {pwForm.formState.isSubmitting ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}