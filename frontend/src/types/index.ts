export interface User {
  id: number;
  email: string;
  role: 'guest' | 'admin' | 'staff';
  first_name: string;
  last_name: string;
  phone_number?: string;
  address?: string;
  date_of_birth?: string;
  nationality?: string;
  gender?: 'male' | 'female' | 'other';
  passport_number?: string;
  profile_picture?: string;
  created_at: string;
}

export interface RoomType {
  id: number;
  name: string;
  description: string;
  base_price: number;
  max_capacity: number;
  room_count?: number;
}

export interface Amenity {
  id: number;
  name: string;
  icon: string;
  room_count?: number;
}

export interface Room {
  id: number;
  room_number: string;
  room_type_id: number;
  room_type: RoomType;
  floor: number;
  bed_type: string;
  size_sqm: number;
  max_capacity: number;
  price_per_night: number;
  description: string;
  status: 'available' | 'occupied' | 'maintenance' | 'inactive';
  images: string[];
  amenities: Amenity[];
  rating?: number;
  created_at: string;
}

export interface Booking {
  id: number;
  reservation_id?: string;
  booking_reference: string;
  guest_id: number;
  guest?: User;
  room_id: number;
  room?: Room;
  check_in_date: string;
  check_out_date: string;
  check_in_actual?: string;
  check_out_actual?: string;
  num_guests: number;
  special_requests?: string;
  nights: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  promo_code?: string;
  reservation_status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  cancel_reason?: string;
  created_at: string;
}

export interface Payment {
  id: number;
  reservation_id: number;
  booking?: Booking;
  amount: number;
  method: string;
  slip_image?: string;
  transaction_ref?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paid_at?: string;
  created_at: string;
}

export interface Promotion {
  id: number;
  promo_code: string;
  description: string;
  discount_percent: number;
  valid_from: string;
  valid_to: string;
  times_used: number;
  is_active: boolean;
}

export interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  role: string;
  status: 'active' | 'inactive';
  hire_date: string;
  created_at: string;
}

export interface Feedback {
  id: number;
  guest_id: number;
  guest?: User;
  booking_id: number;
  booking?: Booking;
  room_id: number;
  room?: Room;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Review {
  id: number;
  guest_name: string;
  rating: number;
  comment: string;
  room_type?: string;
  created_at: string;
}

export interface DashboardStats {
  bookings_today: number;
  revenue_this_month: number;
  occupancy_rate: number;
  available_rooms: number;
}

export interface RevenueChartData {
  date: string;
  revenue: number;
}

export interface BookingsByTypeData {
  room_type: string;
  count: number;
}

export interface ReportData {
  total_revenue: number;
  total_bookings: number;
  average_booking_value: number;
  revenue_by_type: { room_type: string; revenue: number }[];
  revenue_by_day: { date: string; revenue: number }[];
  occupancy_by_type: { room_type: string; rate: number }[];
  most_booked_rooms: { room_number: string; room_type: string; bookings: number }[];
  promo_usage: { promo_code: string; times_used: number; discount_total: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
