import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';
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
  const [page, setPage] = useState(1);
  const [viewSlip, setViewSlip] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; type: 'confirm' | 'reject' | 'refund' } | null>(null);

  const params: Record<string, unknown> = { page, per_page: 20 };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', params],
    queryFn: () => adminService.getAdminPayments(params),
  });

  const payments = data?.data || [];
  const pendingCount = payments.filter(p => p.status === 'pending').length;

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
    { key: 'created_at', label: 'Submitted', render: (p: Payment) => formatDateTime(p.created_at) },
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-navy">Payment Management</h1>
        {pendingCount > 0 && (
          <span className="bg-amber-100 text-amber-800 text-sm font-medium px-3 py-1 rounded-full">
            {pendingCount} pending
          </span>
        )}
      </div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy">
          <option value="">All Payments</option>
          {['pending','completed','failed','refunded'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <AdminTable
        columns={columns}
        data={payments.map(p => ({
          ...p,
          _rowClass: p.status === 'pending' ? 'bg-amber-50' : '',
        }))}
        loading={isLoading}
        keyField="id"
      />

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
