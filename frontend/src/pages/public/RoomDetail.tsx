
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, BedDouble, Maximize2, Star, ChevronDown, MessageSquare, Calendar } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { roomService } from '../../services/roomService';
import { RoomGallery } from '../../components/rooms/RoomGallery';
import { AmenityBadge } from '../../components/rooms/AmenityBadge';
import { AvailabilityCalendar } from '../../components/rooms/AvailabilityCalendar';
import { PriceBreakdown } from '../../components/booking/PriceBreakdown';
import { PromoInput } from '../../components/booking/PromoInput';
import { RoomCard } from '../../components/rooms/RoomCard';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { countNights } from '../../utils/dateUtils';
import { calcSubtotal, calcDiscount, calcTax, calcTotal } from '../../utils/priceUtils';
import 'react-day-picker/src/style.css';

// Mock reviews — replace with real API data when available
const MOCK_REVIEWS = [
  { id: 1, name: 'Sarah M.', rating: 5, date: 'April 2026', comment: 'Absolutely stunning room with breathtaking views. The staff were incredibly attentive and made our stay unforgettable.' },
  { id: 2, name: 'James T.', rating: 4, date: 'March 2026', comment: 'Very comfortable and clean. The amenities were top-notch. Would definitely stay again on my next visit.' },
  { id: 3, name: 'Lily C.', rating: 5, date: 'February 2026', comment: 'Perfect in every way. The room was spacious, the bed was divine, and the view was spectacular.' },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { setRoom, setDates, setNumGuests, setPromo, clearPromo, checkIn, checkOut, numGuests, promoCode, discountPercent } = useBookingStore();

  const [localCheckIn, setLocalCheckIn] = useState<Date | undefined>(checkIn || undefined);
  const [localCheckOut, setLocalCheckOut] = useState<Date | undefined>(checkOut || undefined);
  const [localGuests, setLocalGuests] = useState(numGuests || 1);
  const [promo, setPromoState] = useState<{ code: string; percent: number } | null>(
    promoCode ? { code: promoCode, percent: discountPercent } : null
  );
  const [activePicker, setActivePicker] = useState<'checkin' | 'checkout' | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showMobileBooking, setShowMobileBooking] = useState(false);
  const bookingPanelRef = useRef<HTMLDivElement>(null);

  // Show sticky bar when booking panel scrolls out of view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (bookingPanelRef.current) observer.observe(bookingPanelRef.current);
    return () => observer.disconnect();
  }, []);

  const { data: room, isLoading } = useQuery({
    queryKey: ['room', id],
    queryFn: () => roomService.getRoom(Number(id)),
    enabled: !!id,
  });

  const { data: similar } = useQuery({
    queryKey: ['similar-rooms', room?.room_type_id],
    queryFn: () => roomService.getRooms({ type: room!.room_type_id, per_page: 3 }),
    enabled: !!room,
  });

  const nights = localCheckIn && localCheckOut ? countNights(localCheckIn, localCheckOut) : 0;

  // Fix: support both max_capacity and max_guests field names
  const maxGuests = room?.max_capacity ?? 4;

  function handleBook() {
    if (!room) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/rooms/${id}` } });
      return;
    }
    if (!localCheckIn || !localCheckOut || nights === 0) {
      alert('Please select check-in and check-out dates.');
      return;
    }
    setRoom(room);
    setDates(localCheckIn, localCheckOut);
    setNumGuests(localGuests);
    if (promo) setPromo(promo.code, promo.percent);
    else clearPromo();
    navigate('/booking/confirm');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-10 w-full">
          <Skeleton className="h-80 w-full rounded-xl mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!room) return null;

  const subtotal = calcSubtotal(room.price_per_night, nights);
  const discount = calcDiscount(subtotal, promo?.percent || 0);
  const tax = calcTax(subtotal, discount);
  const total = calcTotal(subtotal, discount, tax);

  const BookingPanel = () => (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-baseline gap-1 mb-5">
        <span className="text-3xl font-bold text-navy">${room.price_per_night}</span>
        <span className="text-gray-400 text-sm">/ night</span>
      </div>

      {/* Inline Date Picker */}
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
        {/* Check-in row */}
        <button
          onClick={() => setActivePicker(activePicker === 'checkin' ? null : 'checkin')}
          className={`w-full flex items-center justify-between px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors ${activePicker === 'checkin' ? 'bg-navy/5' : ''}`}
        >
          <div className="text-left">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Check-in</p>
            <p className={`text-sm mt-0.5 ${localCheckIn ? 'text-navy font-medium' : 'text-gray-400'}`}>
              {localCheckIn ? format(localCheckIn, 'dd MMM yyyy') : 'Select date'}
            </p>
          </div>
          <Calendar className="h-4 w-4 text-gray-400" />
        </button>

        {activePicker === 'checkin' && (
          <div className="border-b border-gray-200 flex justify-center py-2 bg-gray-50">
            <DayPicker
              mode="single"
              selected={localCheckIn}
              onSelect={d => { setLocalCheckIn(d); setActivePicker('checkout'); }}
              disabled={{ before: new Date() }}
            />
          </div>
        )}

        {/* Check-out row */}
        <button
          onClick={() => setActivePicker(activePicker === 'checkout' ? null : 'checkout')}
          className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${activePicker === 'checkout' ? 'bg-navy/5' : ''}`}
        >
          <div className="text-left">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Check-out</p>
            <p className={`text-sm mt-0.5 ${localCheckOut ? 'text-navy font-medium' : 'text-gray-400'}`}>
              {localCheckOut ? format(localCheckOut, 'dd MMM yyyy') : 'Select date'}
            </p>
          </div>
          <Calendar className="h-4 w-4 text-gray-400" />
        </button>

        {activePicker === 'checkout' && (
          <div className="flex justify-center py-2 bg-gray-50">
            <DayPicker
              mode="single"
              selected={localCheckOut}
              onSelect={d => { setLocalCheckOut(d); setActivePicker(null); }}
              disabled={{ before: localCheckIn || new Date() }}
            />
          </div>
        )}
      </div>

      {/* Guests */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Guests</label>
        <div className="relative">
          <select
            value={localGuests}
            onChange={e => setLocalGuests(Number(e.target.value))}
            className="w-full h-10 border border-gray-300 rounded-lg px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-navy appearance-none"
          >
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n} guest{n !== 1 ? 's' : ''}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Promo */}
      <div className="mb-4">
        <PromoInput
          roomId={room.id}
          applied={promo || undefined}
          onApply={(code, percent) => setPromoState({ code, percent })}
          onClear={() => setPromoState(null)}
        />
      </div>

      {/* Price Breakdown */}
      {nights > 0 && (
        <div className="border-t pt-4 mb-4">
          <PriceBreakdown
            pricePerNight={room.price_per_night}
            checkIn={localCheckIn!}
            checkOut={localCheckOut!}
            discountPercent={promo?.percent}
            promoCode={promo?.code}
          />
        </div>
      )}

      <Button className="w-full h-12 text-base" onClick={handleBook}>
        {isAuthenticated ? 'Book Now' : 'Sign in to Book'}
      </Button>
      <p className="text-xs text-gray-400 text-center mt-2">You won't be charged yet</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf8]">
      <Navbar />

      {/* Sticky Summary Bar */}
      {showStickyBar && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-serif font-semibold text-navy text-sm">Room {room.room_number}</p>
              <p className="text-xs text-gray-400">{room.room_type?.name}</p>
            </div>
            {localCheckIn && localCheckOut && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                <span>{format(localCheckIn, 'dd MMM')} → {format(localCheckOut, 'dd MMM')}</span>
                <span>·</span>
                <span>{nights} night{nights !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-bold text-navy">${room.price_per_night}<span className="text-xs text-gray-400 font-normal">/night</span></p>
              {nights > 0 && <p className="text-xs text-gray-400">Total: ${total.toFixed(2)}</p>}
            </div>
            <Button size="sm" onClick={handleBook} className="hidden sm:flex">
              {isAuthenticated ? 'Book Now' : 'Sign in'}
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 w-full">
        {/* Gallery */}
        <div className="mb-6">
          <RoomGallery images={room.images} alt={`Room ${room.room_number}`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Info */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <Badge variant="gold" className="mb-2">{room.room_type?.name}</Badge>
                  <h1 className="font-serif text-3xl text-navy">Room {room.room_number}</h1>
                  <p className="text-gray-500 mt-1">Floor {room.floor}</p>
                </div>
                {room.rating && (
                  <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-amber-700">{room.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                {[
                  { icon: BedDouble, label: room.bed_type || 'Standard Bed' },
                  { icon: Users, label: `Up to ${maxGuests} guest${maxGuests !== 1 ? 's' : ''}` },
                  { icon: Maximize2, label: `${room.size_sqm ?? '—'} m²` },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-gray-600 text-sm bg-gray-100 px-3 py-1.5 rounded-full">
                    <Icon className="h-4 w-4 text-navy" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* About */}
            <div>
              <h2 className="font-serif text-xl text-navy mb-3">About This Room</h2>
              <p className="text-gray-600 leading-relaxed">{room.description || 'No description available.'}</p>
            </div>

            {/* Amenities */}
            {room.amenities?.length > 0 && (
              <div>
                <h2 className="font-serif text-xl text-navy mb-3">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {room.amenities.map(a => <AmenityBadge key={a.id} name={a.name} icon={a.icon} />)}
                </div>
              </div>
            )}

            {/* Availability Calendar */}
            <AvailabilityCalendar roomId={room.id} />

            {/* Reviews Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl text-navy flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-gold" />
                  Guest Reviews
                </h2>
                {room.rating && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={Math.round(room.rating)} />
                    <span className="text-sm font-semibold text-navy">{room.rating.toFixed(1)}</span>
                    <span className="text-sm text-gray-400">({MOCK_REVIEWS.length} reviews)</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {MOCK_REVIEWS.map(review => (
                  <div key={review.id} className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center text-sm font-bold text-navy">
                          {review.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-navy">{review.name}</p>
                          <p className="text-xs text-gray-400">{review.date}</p>
                        </div>
                      </div>
                      <StarRating rating={review.rating} />
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 mt-3 text-center">
                Reviews are from verified guests. Live reviews coming soon.
              </p>
            </div>

            {/* Mobile booking button */}
            <div className="lg:hidden sticky bottom-4 z-40">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-navy text-lg">${room.price_per_night}<span className="text-xs font-normal text-gray-400">/night</span></p>
                  {nights > 0 && <p className="text-xs text-gray-400">{nights} nights · ${total.toFixed(2)} total</p>}
                </div>
                <Button onClick={() => setShowMobileBooking(!showMobileBooking)}>
                  {showMobileBooking ? 'Hide' : 'Book Now'}
                </Button>
              </div>
              {showMobileBooking && (
                <div className="mt-2">
                  <BookingPanel />
                </div>
              )}
            </div>
          </div>

          {/* Right: Booking Panel (desktop) */}
          <div className="lg:col-span-1 hidden lg:block" ref={bookingPanelRef}>
            <div className="sticky top-24">
              <BookingPanel />
            </div>
          </div>
        </div>

        {/* Similar Rooms */}
        {similar && similar.data?.length > 0 && (
          <div className="mt-16">
            <h2 className="font-serif text-2xl text-navy mb-6">Similar Rooms</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similar.data.filter(r => r.id !== room.id).slice(0, 3).map(r => (
                <RoomCard key={r.id} room={r} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}