import api from './api';
import { Booking, PaginatedResponse } from '../types';

export interface CreateBookingPayload {
  room_id: number;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  special_requests?: string;
  promo_code?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}

export const bookingService = {
  createBooking: (data: CreateBookingPayload) =>
    api.post<Booking>('/bookings', data).then(r => r.data),

  getMyBookings: () =>
    api.get<Booking[]>('/bookings/my').then(r => r.data),

  getBooking: (id: number) =>
    api.get<Booking>(`/bookings/${id}`).then(r => r.data),

  cancelBooking: (id: number) =>
    api.delete(`/bookings/${id}/cancel`).then(r => r.data),

  validatePromo: (code: string, roomId: number) =>
    api.post<{ discount_percent: number; message: string }>('/promotions/validate', { code, room_id: roomId }).then(r => r.data),
};
