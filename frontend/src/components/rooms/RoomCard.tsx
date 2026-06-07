import { Link } from 'react-router-dom';
import { Users, Star, BedDouble } from 'lucide-react';
import { Room } from '../../types';
import { formatCurrency } from '../../utils/priceUtils';
import { getImageUrl } from '../../utils/imageUtils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface Props {
  room: Room;
}

const ROOM_TYPE_IMAGES: Record<string, string> = {
  Standard:  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format&fit=crop',
  Deluxe:    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop',
  Suite:     'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&auto=format&fit=crop',
  Family:    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop',
  Penthouse: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&auto=format&fit=crop',
};

export function RoomCard({ room }: Props) {
  const typeName = room.room_type?.name ?? '';
  const rawImage = room.images?.[0] || ROOM_TYPE_IMAGES[typeName]
    || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format&fit=crop';
  const image = getImageUrl(rawImage);

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow group">
      <div className="relative overflow-hidden h-52">
        <img
          src={image}
          alt={`Room ${room.room_number}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <Badge className="absolute top-3 left-3" variant="gold">{room.room_type?.name}</Badge>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-serif font-semibold text-navy">Room {room.room_number}</h3>
            <p className="text-xs text-gray-500">Floor {room.floor}</p>
          </div>
          {room.rating && (
            <div className="flex items-center gap-1 text-xs text-amber-500">
              <Star className="h-3 w-3 fill-amber-400" />
              <span>{room.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {room.room_type?.name ?? 'Standard'}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Up to {room.room_type?.max_capacity ?? 2}</span>
        </div>

        {room.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {room.amenities.slice(0, 4).map((a) => (
              <span key={a.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.name}</span>
            ))}
            {room.amenities.length > 4 && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">+{room.amenities.length - 4}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-navy">{formatCurrency(room.price_per_night)}</span>
            <span className="text-xs text-gray-400"> / night</span>
          </div>
          <Link to={`/rooms/${room.id}`}>
            <Button size="sm">View Details</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
