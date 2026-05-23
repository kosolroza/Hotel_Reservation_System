import { Booking } from '../../types';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/priceUtils';
import { getImageUrl } from '../../utils/imageUtils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';
import { Calendar, Users, Moon } from 'lucide-react';

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold'> = {
  pending: 'warning',
  confirmed: 'info',
  checked_in: 'gold',
  checked_out: 'success',
  cancelled: 'danger',
};

const paymentVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold'> = {
  pending: 'warning',
  completed: 'success',
  failed: 'danger',
  refunded: 'info',
};

interface Props {
  booking: Booking;
  onCancel?: (id: number) => void;
  onFeedback?: (booking: Booking) => void;
}

export function BookingCard({ booking, onCancel, onFeedback }: Props) {
  const image = getImageUrl(booking.room?.images?.[0]) || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&auto=format&fit=crop';
  const canCancel = ['pending', 'confirmed'].includes(booking.reservation_status);
  const canFeedback = booking.reservation_status === 'checked_out';

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col sm:flex-row">
      <img
        src={image}
        alt={`Room ${booking.room?.room_number}`}
        className="w-full sm:w-36 h-40 sm:h-auto object-cover flex-shrink-0"
      />
      <div className="flex-1 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-xs text-gray-400 font-mono">#{booking.booking_reference}</p>
            <h3 className="font-serif font-semibold text-navy">
              Room {booking.room?.room_number} — {booking.room?.room_type?.name}
            </h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant={statusVariants[booking.reservation_status]}>
              {booking.reservation_status.replace('_', ' ')}
            </Badge>
            <Badge variant={paymentVariants[booking.payment_status]}>
              {booking.payment_status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm mb-4">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Calendar className="h-4 w-4 text-navy" />
            <span>{formatDate(booking.check_in_date)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Calendar className="h-4 w-4 text-gold" />
            <span>{formatDate(booking.check_out_date)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Moon className="h-4 w-4" />
            <span>{booking.nights} night{booking.nights !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Users className="h-4 w-4" />
            <span>{booking.num_guests} guest{booking.num_guests !== 1 ? 's' : ''}</span>
          </div>
          <div className="col-span-2 text-right">
            <span className="font-bold text-navy">{formatCurrency(booking.total_amount)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canCancel && onCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onCancel(booking.id)}
            >
              Cancel
            </Button>
          )}
          {booking.payment_status === 'completed' && (
            <Link to={`/my/payments`}>
              <Button variant="outline" size="sm">View Receipt</Button>
            </Link>
          )}
          {canFeedback && onFeedback && (
            <Button variant="navy" size="sm" onClick={() => onFeedback(booking)}>
              Leave Feedback
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
