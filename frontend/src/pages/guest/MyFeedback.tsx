import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { feedbackService } from '../../services/feedbackService';
import { bookingService } from '../../services/bookingService';
import { StarRating } from '../../components/feedback/StarRating';
import { FeedbackModal } from '../../components/feedback/FeedbackModal';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { formatDate } from '../../utils/dateUtils';
import { Booking } from '../../types';
import { MessageSquare } from 'lucide-react';

export default function MyFeedback() {
  const qc = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const { data: feedbacks, isLoading: fbLoading } = useQuery({
    queryKey: ['my-feedback'],
    queryFn: feedbackService.getMyFeedback,
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => bookingService.getMyBookings(),
  });

  const feedbackIds = new Set((feedbacks || []).map(f => f.booking_id));
  const eligibleBookings = (bookingsData || []).filter((b: Booking) => !feedbackIds.has(b.id));

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-2xl text-navy">My Reviews</h1>

      {/* Eligible stays */}
      {eligibleBookings.length > 0 && (
        <div>
          <h2 className="font-semibold text-navy mb-3">Stays Awaiting Review</h2>
          <div className="space-y-3">
            {eligibleBookings.map(booking => (
              <div key={booking.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-medium text-navy">{booking.room?.room_type?.name} — Room {booking.room?.room_number}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(booking.check_in_date)} → {formatDate(booking.check_out_date)}
                  </p>
                </div>
                <Button size="sm" onClick={() => setSelectedBooking(booking)}>
                  Write Review
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submitted reviews */}
      <div>
        <h2 className="font-semibold text-navy mb-3">Submitted Reviews</h2>
        {fbLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : (feedbacks || []).length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MessageSquare className="h-14 w-14 mx-auto mb-3 opacity-40" />
            <p>No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(feedbacks || []).map(fb => (
              <div key={fb.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-medium text-navy">{fb.room?.room_type?.name} — Room {fb.room?.room_number}</p>
                    <p className="text-xs text-gray-400">{formatDate(fb.created_at)}</p>
                  </div>
                  <StarRating value={fb.rating} size="sm" />
                </div>
                <p className="text-sm text-gray-600 mt-3 leading-relaxed">"{fb.comment}"</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <FeedbackModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onSuccess={() => {
          setSelectedBooking(null);
          qc.invalidateQueries({ queryKey: ['my-feedback'] });
          qc.invalidateQueries({ queryKey: ['my-bookings'] });
        }}
      />
    </div>
  );
}
