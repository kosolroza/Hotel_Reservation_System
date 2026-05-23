import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, CheckCircle, XCircle, RotateCcw, Search, Download, TrendingUp, Clock, BadgeCheck, RefreshCcw } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { AdminTable } from '../../components/admin/AdminTable';
import { PaymentStatusBadge } from '../../components/payment/PaymentStatusBadge';
import { SlipViewer } from '../../components/admin/SlipViewer';
import { Button } from '../../components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '../../components/ui/alert-dialog';
import { toast } from '../../components/ui/toast';
import { formatCurrency } from '../../utils/priceUtils';
import { formatDateTime } from '../../utils/dateUtils';
import { Payment } from '../../types';

export default function AdminPayments() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [viewSlip, setViewSlip] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; type: 'confirm' | 'reject' | 'refund' } | null>(null);

  const params: Record<string, unknown> = { page, per_page: 20 };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', params],
    queryFn: () => adminService.getAdminPayments(params),
  });

  const allPayments = data?.data || [];

  // Filter by search and date client-side
  const payments = useMemo(() => {
    return allPayments.filter(p => {
      const guestName = `${p.booking?.guest?.first_name || ''} ${p.booking?.guest?.last_name || ''}`.toLowerCase();
      const bookingRef = (p.booking?.booking_reference || '').toLowerCase();
      const paymentId = `#${p.id}`;
      const q = search.toLowerCase();

      const matchesSearch = !search ||
        guestName.includes(q) ||
        bookingRef.includes(q) ||
        paymentId.includes(q);

      const submittedDate = p.submitted_at ? new Date(p.submitted_at) : null;
      const matchesFrom = !dateFrom || (submittedDate && submittedDate >= new Date(dateFrom));
      const matchesTo = !dateTo || (submittedDate && submittedDate <= new Date(dateTo + 'T23:59:59'));

      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [allPayments, search, dateFrom, dateTo]);

  // Summary stats
  const stats = useMemo(() => ({
    total: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    pending: payments.filter(p => p.status === 'pending').length,
    completed: payments.filter(p => p.status === 'completed').length,
    refunded: payments.filter(p => p.status === 'refunded').length,
  }), [payments]);

  // CSV Export
  function exportCSV() {
    const headers = ['Payment ID', 'Booking Ref', 'Guest', 'Amount', 'Method', 'Submitted', 'Status'];
    const rows = payments.map(p => [
      `#${p.id}`,
      p.booking?.booking_reference || '—',
      `${p.booking?.guest?.first_name || ''} ${p.booking?.guest?.last_name || ''}`.trim() || '—',
      p.amount,
      p.method?.replace('_', ' ') || '—',
      p.submitted_at ? formatDateTime(p.submitted_at) : '—',
      p.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleAction() {
    if (!confirmAction) return;
    try {
      const { id, type } = confirmAction;
      if (type === 'confirm') await adminService.confirmPayment(id);
      else if (type === 'reject') await adminService.rejectPayment(id);
      else await adminService.refundPayment(id);
      toast.success(`Payment ${type}ed!`);
      qc.invalidateQueries({ queryKey: ['admin-payments'] });
    } catch { toast.error('Action failed.'); }
    finally { setConfirmAction(null); }
  }

  const columns = [
    { key: 'id', label: 'Payment ID', render: (p: Payment) => `#${p.id}` },
    { key: 'booking', label: 'Booking Ref', render: (p: Payment) => <span className="font-mono text-xs">{p.booking?.booking_reference || '—'}</span> },
    { key: 'guest', label: 'Guest', render: (p: Payment) => `${p.booking?.guest?.first_name || ''} ${p.booking?.guest?.last_name || ''}`.trim() || '—' },
    { key: 'amount', label: 'Amount', render: (p: Payment) => <span className="font-semibold">{formatCurrency(p.amount)}</span> },
    { key: 'method', label: 'Method', render: (p: Payment) => p.method.replace('_', ' ') },
    { key: 'submitted_at', label: 'Submitted', render: (p: Payment) => p.submitted_at ? formatDateTime(p.submitted_at) : '—' },
    { key: 'status', label: 'Status', render: (p: Payment) => <PaymentStatusBadge status={p.status} /> },
    {
      key: 'actions', label: 'Actions',
      render: (p: Payment) => (
        <div className="flex gap-1.5">
          {p.slip_image && (
            <button onClick={() => setViewSlip(getImageUrl(p.slip_image))} className="p-1.5 text-navy hover:text-gold" title="View Slip">
              <Eye className="h-4 w-4" />
            </button>
          )}
          {p.status === 'pending' && (
            <>
              <button onClick={() => setConfirmAction({ id: p.id, type: 'confirm' })} className="p-1.5 text-green-600 hover:text-green-800" title="Confirm">
                <CheckCircle className="h-4 w-4" />
              </button>
              <button onClick={() => setConfirmAction({ id: p.id, type: 'reject' })} className="p-1.5 text-red-500 hover:text-red-700" title="Reject">
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
          {p.status === 'completed' && (
            <button onClick={() => setConfirmAction({ id: p.id, type: 'refund' })} className="p-1.5 text-blue-500 hover:text-blue-700" title="Refund">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const actionMessages = {
    confirm: { title: 'Confirm Payment?', desc: 'This will mark the payment as completed and confirm the booking.' },
    reject: { title: 'Reject Payment?', desc: 'The guest will be notified to re-upload their payment slip.' },
    refund: { title: 'Refund Payment?', desc: 'This will mark the payment as refunded. Process the bank transfer manually.' },
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-navy">Payment Management</h1>
        <Button variant="outline" size="sm" onClick={exportCSV} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-navy/10 p-2 rounded-lg">
            <TrendingUp className="h-5 w-5 text-navy" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Revenue</p>
            <p className="font-semibold text-navy">{formatCurrency(stats.total)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-lg">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Pending</p>
            <p className="font-semibold text-amber-600">{stats.pending}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <BadgeCheck className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Completed</p>
            <p className="font-semibold text-green-600">{stats.completed}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <RefreshCcw className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Refunded</p>
            <p className="font-semibold text-blue-500">{stats.refunded}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, guest, booking ref..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
        >
          <option value="">All Payments</option>
          {['pending', 'completed', 'failed', 'refunded'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        {/* Date From */}
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
        />

        {/* Date To */}
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
        />

        {/* Clear Filters */}
        {(search || dateFrom || dateTo || statusFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setStatusFilter(''); setPage(1); }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <AdminTable
        columns={columns}
        data={payments.map(p => ({
          ...p,
          _rowClass: p.status === 'pending' ? 'bg-amber-50' : '',
        }))}
        loading={isLoading}
        keyField="id"
      />

      {/* Pagination */}
      {(data?.total_pages || 1) > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
          <span className="flex items-center px-4 text-sm">{page} / {data?.total_pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === data?.total_pages}>Next</Button>
        </div>
      )}

      <SlipViewer url={viewSlip} onClose={() => setViewSlip(null)} />

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction ? actionMessages[confirmAction.type].title : ''}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction ? actionMessages[confirmAction.type].desc : ''}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}