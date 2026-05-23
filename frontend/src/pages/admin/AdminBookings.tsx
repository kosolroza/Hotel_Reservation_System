

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Download, CalendarDays, Users, LogIn, XCircle, Clock } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { BookingStatusUpdater } from '../../components/admin/BookingStatusUpdater';
import { AdminTable } from '../../components/admin/AdminTable';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/priceUtils';
import { Booking } from '../../types';

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold'> = {
  pending: 'warning', confirmed: 'info', checked_in: 'gold', checked_out: 'success', cancelled: 'danger',
};
const paymentVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold'> = {
  pending: 'warning', completed: 'success', failed: 'danger', refunded: 'info',
};

const rowClassMap: Record<string, string> = {
  checked_in: 'bg-amber-50',
  cancelled: 'bg-red-50',
  pending: 'bg-yellow-50',
  confirmed: 'bg-blue-50',
  checked_out: 'bg-green-50',
};

export default function AdminBookings() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [payFilter, setPayFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Booking | null>(null);

  const params: Record<string, unknown> = { page, per_page: 20 };
  if (search) params.search = search;
  if (statusFilter) params.status = statusFilter;
  if (payFilter) params.payment_status = payFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings', params],
    queryFn: () => adminService.getAdminBookings(params),
  });

  const allBookings = data?.data || [];

  // Client-side date filter
  const bookings = useMemo(() => {
    return allBookings.filter(b => {
      const checkIn = b.check_in_date ? new Date(b.check_in_date) : null;
      const matchesFrom = !dateFrom || (checkIn && checkIn >= new Date(dateFrom));
      const matchesTo = !dateTo || (checkIn && checkIn <= new Date(dateTo + 'T23:59:59'));
      return matchesFrom && matchesTo;
    });
  }, [allBookings, dateFrom, dateTo]);

  // Summary stats
  const today = new Date().toISOString().split('T')[0];
  const stats = useMemo(() => ({
    total: allBookings.length,
    checkedInToday: allBookings.filter(b => b.reservation_status === 'checked_in' && b.check_in_date?.startsWith(today)).length,
    pending: allBookings.filter(b => b.reservation_status === 'pending').length,
    cancelled: allBookings.filter(b => b.reservation_status === 'cancelled').length,
  }), [allBookings]);

  // CSV Export
  function exportCSV() {
    const headers = ['Reference', 'Guest', 'Room', 'Check-in', 'Check-out', 'Nights', 'Total', 'Status', 'Payment'];
    const rows = bookings.map(b => [
      b.booking_reference,
      `${b.guest?.first_name || ''} ${b.guest?.last_name || ''}`.trim(),
      `Room ${b.room?.room_number || '?'}`,
      formatDate(b.check_in_date),
      formatDate(b.check_out_date),
      b.nights,
      b.total_amount,
      b.reservation_status,
      b.payment_status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasFilters = search || statusFilter || payFilter || dateFrom || dateTo;

  function clearFilters() {
    setSearch(''); setStatusFilter(''); setPayFilter('');
    setDateFrom(''); setDateTo(''); setPage(1);
  }

  const columns = [
    { key: 'booking_reference', label: 'Reference', render: (b: Booking) => <span className="font-mono text-xs">{b.booking_reference}</span> },
    { key: 'guest', label: 'Guest', render: (b: Booking) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-navy/10 flex items-center justify-center text-xs font-semibold text-navy">
          {(b.guest?.first_name?.[0] || '?').toUpperCase()}
        </div>
        <span>{`${b.guest?.first_name || ''} ${b.guest?.last_name || ''}`.trim() || '—'}</span>
      </div>
    )},
    { key: 'room', label: 'Room', render: (b: Booking) => (
      <span className="font-medium">Room {b.room?.room_number || '?'}</span>
    )},
    { key: 'check_in_date', label: 'Check-in', render: (b: Booking) => formatDate(b.check_in_date) },
    { key: 'check_out_date', label: 'Check-out', render: (b: Booking) => formatDate(b.check_out_date) },
    { key: 'nights', label: 'Nights', render: (b: Booking) => (
      <span className="text-center block">{b.nights}</span>
    )},
    { key: 'total_amount', label: 'Total', render: (b: Booking) => (
      <span className="font-semibold text-navy">{formatCurrency(b.total_amount)}</span>
    )},
    { key: 'reservation_status', label: 'Status', render: (b: Booking) => (
      <Badge variant={statusVariants[b.reservation_status]}>{b.reservation_status.replace('_', ' ')}</Badge>
    )},
    { key: 'payment_status', label: 'Payment', render: (b: Booking) => (
      <Badge variant={paymentVariants[b.payment_status]}>{b.payment_status}</Badge>
    )},
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-navy">Booking Management</h1>
        <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={exportCSV}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-navy/10 p-2 rounded-lg">
            <CalendarDays className="h-5 w-5 text-navy" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Bookings</p>
            <p className="font-semibold text-navy">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-lg">
            <LogIn className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Checked In Today</p>
            <p className="font-semibold text-amber-600">{stats.checkedInToday}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-yellow-100 p-2 rounded-lg">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Pending</p>
            <p className="font-semibold text-yellow-600">{stats.pending}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-lg">
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Cancelled</p>
            <p className="font-semibold text-red-500">{stats.cancelled}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        {/* Row 1: Search + Status + Payment */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by ref, guest, or room..."
              className="pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
          >
            <option value="">All Statuses</option>
            {['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            value={payFilter}
            onChange={e => { setPayFilter(e.target.value); setPage(1); }}
            className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
          >
            <option value="">All Payments</option>
            {['pending', 'completed', 'failed', 'refunded'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Row 2: Date Range + Clear */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500 font-medium whitespace-nowrap">Check-in Date:</span>
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-36">
              <label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-400">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <span className="text-gray-400 text-sm">→</span>
            <div className="relative flex-1 min-w-36">
              <label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-400">To</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 hover:text-red-700 hover:bg-red-50">
              Clear All
            </Button>
          )}
        </div>

        {/* Active filter tags */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 pt-1">
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy/10 text-navy text-xs">
                Search: "{search}"
                <button onClick={() => setSearch('')} className="ml-1 hover:text-red-500">×</button>
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy/10 text-navy text-xs">
                Status: {statusFilter.replace('_', ' ')}
                <button onClick={() => setStatusFilter('')} className="ml-1 hover:text-red-500">×</button>
              </span>
            )}
            {payFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy/10 text-navy text-xs">
                Payment: {payFilter}
                <button onClick={() => setPayFilter('')} className="ml-1 hover:text-red-500">×</button>
              </span>
            )}
            {dateFrom && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy/10 text-navy text-xs">
                From: {dateFrom}
                <button onClick={() => setDateFrom('')} className="ml-1 hover:text-red-500">×</button>
              </span>
            )}
            {dateTo && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy/10 text-navy text-xs">
                To: {dateTo}
                <button onClick={() => setDateTo('')} className="ml-1 hover:text-red-500">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Empty State */}
      {!isLoading && bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
          <CalendarDays className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium text-gray-500">No bookings found</p>
          <p className="text-sm mt-1">Try adjusting your filters.</p>
          {hasFilters && (
            <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <AdminTable
          columns={columns}
          data={bookings.map(b => ({
            ...b,
            _rowClass: rowClassMap[b.reservation_status] || '',
          }))}
          loading={isLoading}
          keyField="id"
          onRowClick={(row) => setSelected(row as unknown as Booking)}
        />
      )}

      {/* Pagination */}
      {(data?.total_pages || 1) > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
          <span className="flex items-center px-4 text-sm">{page} / {data?.total_pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === data?.total_pages}>Next</Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-navy">
              Booking: <span className="font-mono">{selected?.booking_reference}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">

              {/* Status Banner */}
              <div className={`rounded-xl p-4 flex items-center justify-between ${rowClassMap[selected.reservation_status] || 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-navy" />
                  <div>
                    <p className="font-semibold text-navy">{selected.guest?.first_name} {selected.guest?.last_name}</p>
                    <p className="text-xs text-gray-500">{selected.guest?.email}</p>
                  </div>
                </div>
                <Badge variant={statusVariants[selected.reservation_status]}>
                  {selected.reservation_status.replace('_', ' ')}
                </Badge>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Room</p>
                  <p className="font-medium mt-0.5">Room {selected.room?.room_number} — {selected.room?.room_type?.name}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Floor</p>
                  <p className="font-medium mt-0.5">{selected.room?.floor}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Check-in</p>
                  <p className="font-medium mt-0.5">{formatDate(selected.check_in_date)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Check-out</p>
                  <p className="font-medium mt-0.5">{formatDate(selected.check_out_date)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Nights</p>
                  <p className="font-medium mt-0.5">{selected.nights}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Guests</p>
                  <p className="font-medium mt-0.5">{selected.num_guests}</p>
                </div>
                <div className="bg-navy/5 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Total Amount</p>
                  <p className="font-bold text-navy mt-0.5">{formatCurrency(selected.total_amount)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Payment</p>
                  <div className="mt-0.5">
                    <Badge variant={paymentVariants[selected.payment_status]}>{selected.payment_status}</Badge>
                  </div>
                </div>
                {selected.check_in_actual && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Actual Check-in</p>
                    <p className="font-medium mt-0.5">{formatDateTime(selected.check_in_actual)}</p>
                  </div>
                )}
                {selected.check_out_actual && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Actual Check-out</p>
                    <p className="font-medium mt-0.5">{formatDateTime(selected.check_out_actual)}</p>
                  </div>
                )}
                {selected.special_requests && (
                  <div className="col-span-2 bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Special Requests</p>
                    <p className="font-medium mt-0.5">{selected.special_requests}</p>
                  </div>
                )}
                {selected.cancel_reason && (
                  <div className="col-span-2 bg-red-50 rounded-lg p-3">
                    <p className="text-red-400 text-xs">Cancel Reason</p>
                    <p className="font-medium text-red-600 mt-0.5">{selected.cancel_reason}</p>
                  </div>
                )}
              </div>

              {/* Status Updater */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-navy mb-3">Update Status</h3>
                <BookingStatusUpdater
                  booking={selected}
                  onUpdated={() => {
                    qc.invalidateQueries({ queryKey: ['admin-bookings'] });
                    setSelected(null);
                  }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}