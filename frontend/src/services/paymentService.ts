import api from './api';
import { Payment, PaginatedResponse } from '../types';

export const paymentService = {
  createPayment: (bookingId: number, slipFile: File, transactionRef?: string) => {
    const formData = new FormData();
    formData.append('booking_id', String(bookingId));
    formData.append('slip_image', slipFile);
    if (transactionRef) formData.append('transaction_reference', transactionRef);
    return api.post<Payment>('/payments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  getMyPayments: () =>
    api.get<Payment[]>('/payments/my').then(r => r.data),

  getPayment: (id: number) =>
    api.get<Payment>(`/payments/${id}`).then(r => r.data),
};
