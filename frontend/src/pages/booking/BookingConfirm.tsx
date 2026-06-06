import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../store/bookingStore';
import { useAuthStore } from '../../store/authStore';
import { bookingService } from '../../services/bookingService';
import { BookingSummary } from '../../components/booking/BookingSummary';
import { PriceBreakdown } from '../../components/booking/PriceBreakdown';
import { PromoInput } from '../../components/booking/PromoInput';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from '../../components/ui/toast';
import { toISODateString, countNights } from '../../utils/dateUtils';
import { calcSubtotal, calcDiscount, calcTax, calcTotal } from '../../utils/priceUtils';
import { useState } from 'react';

const schema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  phone_number: z.string().min(1, 'Required'),
  special_requests: z.string().optional(),
  num_guests: z.number().min(1),
  terms: z.boolean().refine(v => v === true, { message: 'You must accept the terms' }),
});

type FormData = z.infer<typeof schema>;

export default function BookingConfirm() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const store = useBookingStore();
  const [termsChecked, setTermsChecked] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      num_guests: store.numGuests,
    },
  });

  if (!store.room || !store.checkIn || !store.checkOut) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">No booking in progress.</p>
            <Button className="mt-4" onClick={() => navigate('/rooms')}>Browse Rooms</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const nights = countNights(store.checkIn, store.checkOut);
  const subtotal = store.room.price_per_night * nights;
  const discount = subtotal * (store.discountPercent / 100);
  const tax = (subtotal - discount) * 0.1;
  const total = subtotal - discount + tax;

  async function onSubmit(data: FormData) {
    if (!store.room || !store.checkIn || !store.checkOut) return;
    try {
      const booking = await bookingService.createBooking({
        room_id: store.room.id,
        check_in_date: toISODateString(store.checkIn),
        check_out_date: toISODateString(store.checkOut),
        num_guests: data.num_guests,
        special_requests: data.special_requests,
        promo_code: store.promoCode || undefined,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone_number,
      });
      store.setBookingId(booking.id, booking.booking_reference);
      navigate('/booking/payment');
    } catch {
      toast.error('Failed to create booking. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf8]">
      <Navbar />
      <div className="max-w-6xl mx-auto w-full px-4 py-10">
        <h1 className="font-serif text-3xl text-navy mb-8">Confirm Your Booking</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 space-y-6">
            {/* Guest Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="font-serif text-xl text-navy mb-4">Guest Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input {...register('first_name')} className="mt-1" />
                  {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input {...register('last_name')} className="mt-1" />
                  {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" {...register('email')} className="mt-1" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input type="tel" {...register('phone_number')} className="mt-1" />
                  {errors.phone_number && <p className="text-red-500 text-xs mt-1">{errors.phone_number.message}</p>}
                </div>
                <div>
                  <Label>Number of Guests</Label>
                  <input
                    type="number"
                    min={1}
                    max={store.room.max_capacity}
                    {...register('num_guests', { valueAsNumber: true })}
                    className="mt-1 flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label>Special Requests (optional)</Label>
                <Textarea
                  {...register('special_requests')}
                  className="mt-1"
                  placeholder="Dietary requirements, room preferences, etc."
                  rows={3}
                />
              </div>
            </div>

            {/* Terms */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={termsChecked}
                  onCheckedChange={v => {
                    setTermsChecked(!!v);
                    setValue('terms', !!v);
                  }}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="text-navy underline">Terms & Conditions</a>{' '}
                  and{' '}
                  <a href="#" className="text-navy underline">Cancellation Policy</a>.
                  I understand that the booking is not confirmed until payment is verified.
                </span>
              </label>
              {errors.terms && <p className="text-red-500 text-xs mt-2">{errors.terms.message}</p>}
            </div>

            <Button type="submit" className="w-full h-12 text-base" disabled={isSubmitting || !termsChecked}>
              {isSubmitting ? 'Creating Booking...' : 'Confirm & Proceed to Payment'}
            </Button>
          </form>

          {/* Summary */}
          <div className="space-y-4">
            <BookingSummary
              room={store.room}
              checkIn={store.checkIn}
              checkOut={store.checkOut}
              numGuests={store.numGuests}
              promoCode={store.promoCode}
              discountPercent={store.discountPercent}
              total={total}
            />
            <div className="bg-white rounded-xl shadow-md p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-navy mb-2">Promo Code</h3>
                <PromoInput
                  roomId={store.room.id}
                  applied={store.promoCode ? { code: store.promoCode, percent: store.discountPercent } : undefined}
                  onApply={(code, percent) => store.setPromo(code, percent)}
                  onClear={() => store.clearPromo()}
                />
              </div>
              <div>
                <h3 className="font-semibold text-navy mb-3">Price Breakdown</h3>
                <PriceBreakdown
                  pricePerNight={store.room.price_per_night}
                  checkIn={store.checkIn}
                  checkOut={store.checkOut}
                  discountPercent={store.discountPercent}
                  promoCode={store.promoCode}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
