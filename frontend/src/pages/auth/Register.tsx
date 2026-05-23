
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Hotel, Eye, EyeOff, User, Mail, Phone, MapPin, Calendar, Globe, ShieldCheck, Lock } from 'lucide-react';
import { useState } from 'react';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { toast } from '../../components/ui/toast';

const NATIONALITIES = [
  'Afghan', 'Albanian', 'Algerian', 'American', 'Argentine', 'Australian',
  'Austrian', 'Bangladeshi', 'Belgian', 'Brazilian', 'Cambodian', 'Canadian',
  'Chilean', 'Chinese', 'Colombian', 'Croatian', 'Czech', 'Danish', 'Dutch',
  'Egyptian', 'Ethiopian', 'Filipino', 'Finnish', 'French', 'German', 'Ghanaian',
  'Greek', 'Hungarian', 'Indian', 'Indonesian', 'Iranian', 'Iraqi', 'Irish',
  'Israeli', 'Italian', 'Japanese', 'Jordanian', 'Kenyan', 'Laotian', 'Malaysian',
  'Mexican', 'Moroccan', 'Burmese', 'Nepali', 'New Zealander', 'Nigerian',
  'Norwegian', 'Pakistani', 'Peruvian', 'Polish', 'Portuguese', 'Romanian',
  'Russian', 'Saudi', 'Singaporean', 'South African', 'South Korean', 'Spanish',
  'Sri Lankan', 'Swedish', 'Swiss', 'Taiwanese', 'Thai', 'Turkish', 'Ukrainian',
  'Emirati', 'British', 'Venezuelan', 'Vietnamese', 'Yemeni', 'Zimbabwean',
];

const schema = z.object({
  first_name: z.string().min(1, 'First name required'),
  last_name: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email'),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  passport_number: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

type FormData = z.infer<typeof schema>;

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-400' };
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-400' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

export default function Register() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState(1);
  const [nationalitySearch, setNationalitySearch] = useState('');
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);

  const { register, handleSubmit, watch, trigger, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const passwordValue = watch('password') || '';
  const strength = getPasswordStrength(passwordValue);

  async function goToStep2() {
    const valid = await trigger(['first_name', 'last_name', 'email']);
    if (valid) setStep(2);
  }

  async function onSubmit(data: FormData) {
    try {
      const { confirm_password, ...payload } = data;
      const result = await authService.register(payload);
      login(result.user, result.access_token);
      toast.success('Account created! Welcome to Grand Luxe Hotel.');
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Registration failed. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-navy flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gold rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-gold rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-3 relative z-10">
          <Hotel className="h-8 w-8 text-gold" />
          <span className="font-serif text-2xl font-semibold text-white">Grand Luxe Hotel</span>
        </Link>

        {/* Quote */}
        <div className="relative z-10">
          <p className="font-serif text-3xl text-white leading-relaxed mb-6">
            "Where every stay becomes an unforgettable memory."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/30 flex items-center justify-center">
              <Hotel className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Grand Luxe Hotel</p>
              <p className="text-white/50 text-xs">Luxury & Comfort Since 2005</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="relative z-10 space-y-3">
          {[
            'Exclusive member rates',
            'Early check-in & late check-out',
            'Priority room upgrades',
          ].map(benefit => (
            <div key={benefit} className="flex items-center gap-2 text-white/80 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-gold" />
              {benefit}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#fafaf8] overflow-y-auto">
        <div className="w-full max-w-lg">

          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-navy">
              <Hotel className="h-7 w-7 text-gold" />
              <span className="font-serif text-xl font-semibold">Grand Luxe Hotel</span>
            </Link>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h2 className="font-serif text-3xl text-navy">Create an Account</h2>
            <p className="text-gray-500 text-sm mt-1">Join us for an exclusive experience</p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-3 mb-8">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step >= s ? 'bg-navy text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {s}
                </div>
                <span className={`text-sm ${step >= s ? 'text-navy font-medium' : 'text-gray-400'}`}>
                  {s === 1 ? 'Personal Info' : 'Account Security'}
                </span>
                {s < 2 && <div className={`w-12 h-0.5 ${step > s ? 'bg-navy' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Step 1 — Personal Info */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input {...register('first_name')} className="pl-9" placeholder="John" />
                    </div>
                    {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input {...register('last_name')} className="pl-9" placeholder="Doe" />
                    </div>
                    {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email Address *</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input type="email" {...register('email')} className="pl-9" placeholder="you@example.com" />
                    </div>
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input type="tel" {...register('phone_number')} className="pl-9" placeholder="+855 12 345 678" />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <Label>Address</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input {...register('address')} className="pl-9" placeholder="Your address" />
                  </div>
                </div>

                {/* DOB, Nationality, Gender */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Date of Birth</Label>
                    <div className="relative mt-1">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input type="date" {...register('date_of_birth')} className="pl-9" />
                    </div>
                  </div>
                  <div>
                    <Label>Nationality</Label>
                    <div className="relative mt-1">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <input
                        type="text"
                        placeholder="Search nationality..."
                        value={nationalitySearch}
                        onChange={e => { setNationalitySearch(e.target.value); setShowNationalityDropdown(true); }}
                        onFocus={() => setShowNationalityDropdown(true)}
                        onBlur={() => setTimeout(() => setShowNationalityDropdown(false), 150)}
                        className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                      />
                      <input type="hidden" {...register('nationality')} />
                      {showNationalityDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {NATIONALITIES.filter(n => n.toLowerCase().includes(nationalitySearch.toLowerCase())).map(n => (
                            <button
                              key={n}
                              type="button"
                              onMouseDown={() => {
                                setNationalitySearch(n);
                                setValue('nationality', n);
                                setShowNationalityDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-navy/5 hover:text-navy"
                            >
                              {n}
                            </button>
                          ))}
                          {NATIONALITIES.filter(n => n.toLowerCase().includes(nationalitySearch.toLowerCase())).length === 0 && (
                            <p className="px-3 py-2 text-sm text-gray-400">No results found</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <select
                      {...register('gender')}
                      className="mt-1 w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy bg-white"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Passport */}
                <div>
                  <Label>Passport / ID Number</Label>
                  <div className="relative mt-1">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input {...register('passport_number')} className="pl-9" placeholder="AB1234567" />
                  </div>
                </div>

                <Button type="button" className="w-full h-11" onClick={goToStep2}>
                  Continue →
                </Button>
              </div>
            )}

            {/* Step 2 — Account Security */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="bg-navy/5 rounded-xl p-4 flex items-center gap-3">
                  <Lock className="h-5 w-5 text-navy" />
                  <p className="text-sm text-navy">Choose a strong password to protect your account.</p>
                </div>

                {/* Password */}
                <div>
                  <Label>Password *</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      className="pr-10"
                      placeholder="Min 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}

                  {/* Password Strength */}
                  {passwordValue && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              i <= strength.score ? strength.color : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs ${strength.score <= 1 ? 'text-red-400' : strength.score <= 3 ? 'text-amber-500' : 'text-green-600'}`}>
                        {strength.label} password
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <Label>Confirm Password *</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      {...register('confirm_password')}
                      className="pr-10"
                      placeholder="Repeat password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}>
                    ← Back
                  </Button>
                  <Button type="submit" className="flex-1 h-11" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-navy font-medium hover:text-gold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}