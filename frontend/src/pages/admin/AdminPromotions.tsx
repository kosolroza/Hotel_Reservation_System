import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, RefreshCw, Search, Tag, CheckCircle, XCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminService } from '../../services/adminService';
import { AdminTable } from '../../components/admin/AdminTable';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '../../components/ui/alert-dialog';
import { toast } from '../../components/ui/toast';
import { Promotion } from '../../types';
import { formatDate } from '../../utils/dateUtils';

const schema = z.object({
  promo_code: z.string().min(1).toUpperCase(),
  description: z.string().optional(),
  discount_percent: z.number().min(0).max(100),
  valid_from: z.string().min(1),
  valid_to: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

function generateCode() {
  return 'PROMO' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function getDaysUntilExpiry(validTo: string) {
  const diff = new Date(validTo).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function AdminPromotions() {
  const qc = useQueryClient();
  const [editPromo, setEditPromo] = useState<Promotion | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: promos, isLoading } = useQuery({ queryKey: ['admin-promotions'], queryFn: adminService.getPromotions });

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const now = new Date();

  // Summary stats
  const stats = useMemo(() => {
    const all = promos || [];
    return {
      total: all.length,
      active: all.filter(p => new Date(p.valid_to) >= now).length,
      expired: all.filter(p => new Date(p.valid_to) < now).length,
      totalUsed: all.reduce((sum, p) => sum + (p.times_used || 0), 0),
    };
  }, [promos]);

  // Filtered promotions
  const filtered = useMemo(() => {
    return (promos || []).filter(p => {
      const q = search.toLowerCase();
      const matchesSearch = !search ||
        p.promo_code.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q);

      const isExpired = new Date(p.valid_to) < now;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'active' && !isExpired) ||
        (statusFilter === 'expired' && isExpired);

      return matchesSearch && matchesStatus;
    });
  }, [promos, search, statusFilter]);

  function openCreate() {
    reset({ promo_code: generateCode(), discount_percent: 10, valid_from: new Date().toISOString().split('T')[0] });
    setEditPromo(null); setShowForm(true);
  }
  function openEdit(p: Promotion) {
    setEditPromo(p);
    reset({ promo_code: p.promo_code, description: p.description, discount_percent: p.discount_percent, valid_from: p.valid_from.split('T')[0], valid_to: p.valid_to.split('T')[0] });
    setShowForm(true);
  }

  async function onSubmit(data: FormData) {
    try {
      if (editPromo) { await adminService.updatePromotion(editPromo.id, data); toast.success('Updated!'); }
      else { await adminService.createPromotion(data); toast.success('Created!'); }
      qc.invalidateQueries({ queryKey: ['admin-promotions'] });
      setShowForm(false);
    } catch { toast.error('Failed to save.'); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await adminService.deletePromotion(deleteId); toast.success('Deleted.'); qc.invalidateQueries({ queryKey: ['admin-promotions'] }); }
    catch { toast.error('Failed to delete.'); }
    finally { setDeleteId(null); }
  }

  const columns = [
    {
      key: 'promo_code', label: 'Code',
      render: (p: Promotion) => <span className="font-mono font-bold text-navy">{p.promo_code}</span>
    },
    { key: 'description', label: 'Description', render: (p: Promotion) => p.description || '—' },
    { key: 'discount_percent', label: 'Discount', render: (p: Promotion) => (
      <span className="font-semibold text-gold">{p.discount_percent}%</span>
    )},
    { key: 'valid_from', label: 'From', render: (p: Promotion) => formatDate(p.valid_from) },
    {
      key: 'valid_to', label: 'To',
      render: (p: Promotion) => {
        const days = getDaysUntilExpiry(p.valid_to);
        return (
          <div className="flex items-center gap-1.5">
            <span>{formatDate(p.valid_to)}</span>
            {days > 0 && days <= 7 && (
              <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                <AlertTriangle className="h-3 w-3" /> {days}d left
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'times_used', label: 'Used',
      render: (p: Promotion) => (
        <span className="text-sm text-gray-600">{p.times_used || 0} uses</span>
      )
    },
    {
      key: 'status', label: 'Status',
      render: (p: Promotion) => {
        const expired = new Date(p.valid_to) < now;
        return <Badge variant={expired ? 'danger' : 'success'}>{expired ? 'Expired' : 'Active'}</Badge>;
      }
    },
    {
      key: 'actions', label: 'Actions',
      render: (p: Promotion) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(p)} className="text-navy hover:text-gold"><Edit className="h-4 w-4" /></button>
          <button onClick={() => setDeleteId(p.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-navy">Promotions</h1>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Promotion
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-navy/10 p-2 rounded-lg">
            <Tag className="h-5 w-5 text-navy" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Promos</p>
            <p className="font-semibold text-navy">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Active</p>
            <p className="font-semibold text-green-600">{stats.active}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-lg">
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Expired</p>
            <p className="font-semibold text-red-500">{stats.expired}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-gold/10 p-2 rounded-lg">
            <TrendingUp className="h-5 w-5 text-gold" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Used</p>
            <p className="font-semibold text-gold-600">{stats.totalUsed}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
        {(search || statusFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Table or Empty State */}
      {!isLoading && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
          <Tag className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium text-gray-500">No promotions found</p>
          <p className="text-sm mt-1">Try adjusting your filters or add a new promotion.</p>
          <Button onClick={openCreate} className="mt-4 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Promotion
          </Button>
        </div>
      ) : (
        <AdminTable
          columns={columns}
          data={filtered.map(p => ({
            ...p,
            _rowClass: getDaysUntilExpiry(p.valid_to) <= 7 && getDaysUntilExpiry(p.valid_to) > 0
              ? 'bg-amber-50'
              : '',
          }))}
          loading={isLoading}
          keyField="id"
        />
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editPromo ? 'Edit Promotion' : 'Add Promotion'}</DialogTitle></DialogHeader>
          <form className="space-y-4">
            <div>
              <Label>Promo Code</Label>
              <div className="flex gap-2 mt-1">
                <Input {...register('promo_code')} className="uppercase" />
                <Button type="button" variant="outline" size="icon" onClick={() => setValue('promo_code', generateCode())}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {errors.promo_code && <p className="text-red-500 text-xs mt-1">{errors.promo_code.message}</p>}
            </div>
            <div><Label>Description</Label><Textarea {...register('description')} className="mt-1" rows={2} /></div>
            <div><Label>Discount (%)</Label><Input type="number" min={0} max={100} {...register('discount_percent', { valueAsNumber: true })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valid From</Label><Input type="date" {...register('valid_from')} className="mt-1" /></div>
              <div><Label>Valid To</Label><Input type="date" {...register('valid_to')} className="mt-1" /></div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : editPromo ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promotion?</AlertDialogTitle>
            <AlertDialogDescription>This promo code will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}