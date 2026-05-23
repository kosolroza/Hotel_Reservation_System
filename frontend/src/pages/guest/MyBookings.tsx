import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../../services/bookingService';
import { BookingCard } from '../../components/booking/BookingCard';
import { FeedbackModal } from '../../components/feedback/FeedbackModal';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '../../components/ui/alert-dialog';
import { toast } from '../../components/ui/toast';
import { Booking } from '../../types';
import { CalendarX } from 'lucide-react';

const TABS = [
  { value: 'upcoming', label: 'Upcoming', statuses: ['pending', 'confirmed'] },
  { value: 'active', label: 'Active', statuses: ['checked_in'] },
  { value: 'past', label: 'Past', statuses: ['checked_out'] },
  { value: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
];

export default function MyBookings() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [feedbackBooking, setFeedbackBooking] = useState<Booking | null>(null);

  const { data: allBookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => bookingService.getMyBookings(),
  });

  const currentStatuses = TABS.find(t => t.value === activeTab)?.statuses || [];
  const bookings = allBookings.filter(b => currentStatuses.includes(b.reservation_status));

  async function handleCancel() {
    if (!cancelId) return;
    try {
      await bookingService.cancelBooking(cancelId);
      toast.success('Booking cancelled.');
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
    } catch {
      toast.error('Failed to cancel booking.');
    } finally {
      setCancelId(null);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-2xl text-navy mb-6">My Bookings</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          {TABS.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>

        {TABS.map(t => (
          <TabsContent key={t.value} value={t.value}>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <CalendarX className="h-14 w-14 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No {t.label.toLowerCase()} bookings</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map(booking => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onCancel={id => setCancelId(id)}
                    onFeedback={b => setFeedbackBooking(b)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your booking will be cancelled immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleCancel}>
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        booking={feedbackBooking}
        onClose={() => setFeedbackBooking(null)}
        onSuccess={() => { setFeedbackBooking(null); qc.invalidateQueries({ queryKey: ['my-bookings'] }); }}
      />
    </div>
  );
}
