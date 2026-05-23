
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, Users, UserCheck, UserX, Briefcase } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminService } from '../../services/adminService';
import { AdminTable } from '../../components/admin/AdminTable';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '../../components/ui/alert-dialog';
import { toast } from '../../components/ui/toast';
import { Staff } from '../../types';
import { formatDate } from '../../utils/dateUtils';

const schema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone_number: z.string().optional(),
  role: z.string().min(1),
  status: z.enum(['active', 'inactive']),
  hire_date: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

const ROLES = ['Receptionist', 'Housekeeping', 'Manager', 'Concierge', 'Security', 'Chef', 'Maintenance'];

const ROLE_COLORS: Record<string, string> = {
  Manager: 'bg-purple-100 text-purple-700',
  Receptionist: 'bg-blue-100 text-blue-700',
  Housekeeping: 'bg-green-100 text-green-700',
  Concierge: 'bg-amber-100 text-amber-700',
  Security: 'bg-red-100 text-red-700',
  Chef: 'bg-orange-100 text-orange-700',
  Maintenance: 'bg-gray-100 text-gray-700',
};

const AVATAR_COLORS = [
  'bg-navy/20 text-navy',
  'bg-gold/20 text-yellow-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-blue-100 text-blue-700',
];

function getAvatarColor(name: string) {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function AdminStaff() {
  const qc = useQueryClient();
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff', page],
    queryFn: () => adminService.getStaff({ page, per_page: 20 }),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  function openCreate() {
    reset({ status: 'active', hire_date: new Date().toISOString().split('T')[0] });
    setEditStaff(null); setShowForm(true);
  }
  function openEdit(s: Staff) {
    setEditStaff(s);
    reset({ first_name: s.first_name, last_name: s.last_name, email: s.email, phone_number: s.phone_number, role: s.role, status: s.status, hire_date: s.hire_date });
    setShowForm(true);
  }

  async function onSubmit(data: FormData) {
    try {
      if (editStaff) { await adminService.updateStaff(editStaff.id, data); toast.success('Staff updated!'); }
      else { await adminService.createStaff(data); toast.success('Staff added!'); }
      qc.invalidateQueries({ queryKey: ['admin-staff'] });
      setShowForm(false);
    } catch { toast.error('Failed to save.'); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await adminService.deleteStaff(deleteId); toast.success('Staff removed.'); qc.invalidateQueries({ queryKey: ['admin-staff'] }); }
    catch { toast.error('Failed to remove.'); }
    finally { setDeleteId(null); }
  }

  const allStaff = data?.data || [];

  // Summary stats
  const stats = useMemo(() => ({
    total: allStaff.length,
    active: allStaff.filter(s => s.status === 'active').length,
    inactive: allStaff.filter(s => s.status === 'inactive').length,
    roles: [...new Set(allStaff.map(s => s.role))].length,
  }), [allStaff]);

  // Client-side filtering
  const filtered = useMemo(() => {
    return allStaff.filter(s => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      const q = search.toLowerCase();
      const matchesSearch = !search || fullName.includes(q) || s.email.toLowerCase().includes(q);
      const matchesRole = !roleFilter || s.role === roleFilter;
      const matchesStatus = !statusFilter || s.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [allStaff, search, roleFilter, statusFilter]);

  const hasFilters = search || roleFilter || statusFilter;

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (s: Staff) => {
        const initials = `${s.first_name[0]}${s.last_name[0]}`.toUpperCase();
        const colorClass = getAvatarColor(s.first_name);
        return (
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}`}>
              {initials}
            </div>
            <div>
              <p className="font-medium">{s.first_name} {s.last_name}</p>
              <p className="text-xs text-gray-400">{s.email}</p>
            </div>
          </div>
        );
      }
    },
    { key: 'phone_number', label: 'Phone', render: (s: Staff) => s.phone_number || '—' },
    {
      key: 'role', label: 'Role',
      render: (s: Staff) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[s.role] || 'bg-gray-100 text-gray-700'}`}>
          {s.role}
        </span>
      )
    },
    {
      key: 'status', label: 'Status',
      render: (s: Staff) => <Badge variant={s.status === 'active' ? 'success' : 'danger'}>{s.status}</Badge>
    },
    { key: 'hire_date', label: 'Hire Date', render: (s: Staff) => formatDate(s.hire_date) },
    {
      key: 'actions', label: 'Actions',
      render: (s: Staff) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(s)} className="text-navy hover:text-gold"><Edit className="h-4 w-4" /></button>
          <button onClick={() => setDeleteId(s.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-navy">Staff Management</h1>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Staff
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-navy/10 p-2 rounded-lg">
            <Users className="h-5 w-5 text-navy" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Staff</p>
            <p className="font-semibold text-navy">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <UserCheck className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Active</p>
            <p className="font-semibold text-green-600">{stats.active}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-lg">
            <UserX className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Inactive</p>
            <p className="font-semibold text-red-500">{stats.inactive}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Briefcase className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Roles</p>
            <p className="font-semibold text-purple-600">{stats.roles}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
        >
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Empty State */}
      {!isLoading && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
          <Users className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium text-gray-500">No staff found</p>
          <p className="text-sm mt-1">Try adjusting your filters or add a new staff member.</p>
          <Button onClick={openCreate} className="mt-4 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Staff
          </Button>
        </div>
      ) : (
        <AdminTable
          columns={columns}
          data={filtered.map(s => ({
            ...s,
            _rowClass: s.status === 'inactive' ? 'opacity-60' : '',
          }))}
          loading={isLoading}
          keyField="id"
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

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editStaff ? 'Edit Staff' : 'Add Staff'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name</Label>
                <Input {...register('first_name')} className="mt-1" placeholder="John" />
                {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <Label>Last Name</Label>
                <Input {...register('last_name')} className="mt-1" placeholder="Doe" />
                {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" {...register('email')} className="mt-1" placeholder="john@hotel.com" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label>Phone</Label>
                <Input {...register('phone_number')} className="mt-1" placeholder="+855 12 345 678" />
              </div>
              <div>
                <Label>Role</Label>
                <select {...register('role')} className="mt-1 w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy">
                  <option value="">Select role</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
              </div>
              <div>
                <Label>Status</Label>
                <select {...register('status')} className="mt-1 w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label>Hire Date</Label>
                <Input type="date" {...register('hire_date')} className="mt-1" />
                {errors.hire_date && <p className="text-red-500 text-xs mt-1">{errors.hire_date.message}</p>}
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editStaff ? 'Update' : 'Add Staff'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff?</AlertDialogTitle>
            <AlertDialogDescription>This will deactivate the staff member.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}