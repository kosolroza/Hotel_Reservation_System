import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, Users, UserCheck, UserX, Briefcase } from 'lucide-react';
import { useForm, Resolver } from 'react-hook-form';
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

// Schema matches backend StaffCreate
const schema = z.object({
  user_id: z.number().min(1, 'Please select a user'),
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required'),
  salary: z.number().optional(),
  hire_date: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

const DEPARTMENTS = ['Front Office', 'Housekeeping', 'Food & Beverage', 'Management', 'Security', 'Maintenance', 'Finance', 'Marketing'];

const POSITIONS: Record<string, string[]> = {
  'Front Office': ['Receptionist', 'Concierge', 'Front Desk Manager'],
  'Housekeeping': ['Housekeeper', 'Laundry Attendant', 'Housekeeping Supervisor'],
  'Food & Beverage': ['Chef', 'Waiter', 'Bartender', 'F&B Manager'],
  'Management': ['General Manager', 'Assistant Manager', 'Department Head'],
  'Security': ['Security Guard', 'Security Supervisor'],
  'Maintenance': ['Technician', 'Maintenance Supervisor'],
  'Finance': ['Accountant', 'Finance Manager'],
  'Marketing': ['Marketing Executive', 'Sales Manager'],
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
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // User search for form
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff', page],
    queryFn: () => adminService.getStaff({ page, per_page: 20 }),
  });

  // Fetch guests/users to link as staff
  const { data: usersData } = useQuery({
    queryKey: ['admin-guests', userSearch],
    queryFn: () => adminService.getGuests({ search: userSearch, per_page: 10 }),
    enabled: showForm,
  });


const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData, any, FormData>({ 
  resolver: zodResolver(schema) as Resolver<FormData>,
  defaultValues: { is_active: true },
});

  const watchedDept = watch('department');

  function openCreate() {
    reset({ is_active: true });
    setSelectedUser(null);
    setUserSearch('');
    setSelectedDept('');
    setEditStaff(null);
    setShowForm(true);
  }

  function openEdit(s: Staff) {
    setEditStaff(s);
    reset({
      user_id: s.user_id,
      department: s.department,
      position: s.position,
      salary: s.salary,
      hire_date: s.hire_date ? s.hire_date.split('T')[0] : '',
      is_active: s.is_active,
    });
    setSelectedUser(s.user ? { id: s.user_id, name: `${s.user.first_name} ${s.user.last_name}`, email: s.user.email } : null);
    setSelectedDept(s.department);
    setShowForm(true);
  }

  async function onSubmit(data: FormData) {
    try {
      const payload = {
        ...data,
        hire_date: data.hire_date ? new Date(data.hire_date).toISOString() : undefined,
      };
      if (editStaff) {
        await adminService.updateStaff(editStaff.id, payload);
        toast.success('Staff updated!');
      } else {
        await adminService.createStaff(payload);
        toast.success('Staff added!');
      }
      qc.invalidateQueries({ queryKey: ['admin-staff'] });
      setShowForm(false);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to save.';
      toast.error(msg);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await adminService.deleteStaff(deleteId);
      toast.success('Staff removed.');
      qc.invalidateQueries({ queryKey: ['admin-staff'] });
    } catch { toast.error('Failed to remove.'); }
    finally { setDeleteId(null); }
  }

  const allStaff = data?.data || [];

  const stats = useMemo(() => ({
    total: allStaff.length,
    active: allStaff.filter(s => s.is_active).length,
    inactive: allStaff.filter(s => !s.is_active).length,
    depts: [...new Set(allStaff.map(s => s.department))].length,
  }), [allStaff]);

  const filtered = useMemo(() => {
    return allStaff.filter(s => {
      const fullName = `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.toLowerCase();
      const q = search.toLowerCase();
      const matchesSearch = !search || fullName.includes(q) || (s.user?.email || '').toLowerCase().includes(q);
      const matchesDept = !deptFilter || s.department === deptFilter;
      const matchesStatus = !statusFilter ||
        (statusFilter === 'active' && s.is_active) ||
        (statusFilter === 'inactive' && !s.is_active);
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [allStaff, search, deptFilter, statusFilter]);

  const hasFilters = search || deptFilter || statusFilter;

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (s: Staff) => {
        const firstName = s.user?.first_name || '?';
        const lastName = s.user?.last_name || '';
        const initials = `${firstName[0]}${lastName[0] || ''}`.toUpperCase();
        const colorClass = getAvatarColor(firstName);
        return (
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}`}>
              {initials}
            </div>
            <div>
              <p className="font-medium">{firstName} {lastName}</p>
              <p className="text-xs text-gray-400">{s.user?.email || '—'}</p>
            </div>
          </div>
        );
      }
    },
    { key: 'department', label: 'Department', render: (s: Staff) => (
      <span className="text-sm text-gray-700">{s.department}</span>
    )},
    { key: 'position', label: 'Position', render: (s: Staff) => (
      <span className="text-sm font-medium text-navy">{s.position}</span>
    )},
    { key: 'salary', label: 'Salary', render: (s: Staff) => s.salary ? `$${Number(s.salary).toFixed(2)}` : '—' },
    { key: 'hire_date', label: 'Hire Date', render: (s: Staff) => s.hire_date ? formatDate(s.hire_date) : '—' },
    {
      key: 'is_active', label: 'Status',
      render: (s: Staff) => <Badge variant={s.is_active ? 'success' : 'danger'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
    },
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
        {[
          { label: 'Total Staff', value: stats.total, icon: Users, color: 'bg-navy/10', text: 'text-navy' },
          { label: 'Active', value: stats.active, icon: UserCheck, color: 'bg-green-100', text: 'text-green-600' },
          { label: 'Inactive', value: stats.inactive, icon: UserX, color: 'bg-red-100', text: 'text-red-500' },
          { label: 'Departments', value: stats.depts, icon: Briefcase, color: 'bg-purple-100', text: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, color, text }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}><Icon className={`h-5 w-5 ${text}`} /></div>
            <div><p className="text-xs text-gray-500">{label}</p><p className={`font-semibold ${text}`}>{value}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }} className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy">
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {hasFilters && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter(''); setPage(1); }}>Clear</Button>}
      </div>

      {/* Empty State / Table */}
      {!isLoading && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
          <Users className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium text-gray-500">No staff found</p>
          <p className="text-sm mt-1">Try adjusting your filters or add a new staff member.</p>
          <Button onClick={openCreate} className="mt-4 flex items-center gap-2"><Plus className="h-4 w-4" /> Add Staff</Button>
        </div>
      ) : (
        <AdminTable
          columns={columns}
          data={filtered.map(s => ({ ...s, _rowClass: !s.is_active ? 'opacity-60' : '' }))}
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

            {/* User Search — only for create */}
            {!editStaff && (
              <div>
                <Label>Select User <span className="text-red-500">*</span></Label>
                <p className="text-xs text-gray-400 mb-1">The user must already have an account</p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={e => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                    onFocus={() => setShowUserDropdown(true)}
                    onBlur={() => setTimeout(() => setShowUserDropdown(false), 150)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                  />
                  {selectedUser && (
                    <div className="mt-1.5 px-3 py-2 bg-navy/5 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-navy">{selectedUser.name}</p>
                        <p className="text-xs text-gray-400">{selectedUser.email}</p>
                      </div>
                      <button type="button" onClick={() => { setSelectedUser(null); setValue('user_id', 0); }} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                    </div>
                  )}
                  {showUserDropdown && usersData?.data && usersData.data.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {usersData.data.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onMouseDown={() => {
                            setSelectedUser({ id: u.id, name: `${u.first_name} ${u.last_name}`, email: u.email });
                            setValue('user_id', u.id);
                            setUserSearch(`${u.first_name} ${u.last_name}`);
                            setShowUserDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-navy/5 border-b border-gray-50 last:border-0"
                        >
                          <p className="text-sm font-medium">{u.first_name} {u.last_name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.user_id && <p className="text-red-500 text-xs mt-1">{errors.user_id.message}</p>}
              </div>
            )}

            {/* Department & Position */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Department <span className="text-red-500">*</span></Label>
                <select
                  {...register('department')}
                  onChange={e => { setValue('department', e.target.value); setSelectedDept(e.target.value); setValue('position', ''); }}
                  className="mt-1 w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>}
              </div>
              <div>
                <Label>Position <span className="text-red-500">*</span></Label>
                <select
                  {...register('position')}
                  className="mt-1 w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                >
                  <option value="">Select position</option>
                  {(POSITIONS[selectedDept || watchedDept] || []).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position.message}</p>}
              </div>
            </div>

            {/* Salary & Hire Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Salary ($/month)</Label>
                <Input type="number" step="0.01" {...register('salary', { valueAsNumber: true })} className="mt-1" placeholder="e.g. 500" />
              </div>
              <div>
                <Label>Hire Date</Label>
                <Input type="date" {...register('hire_date')} className="mt-1" />
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                {...register('is_active')}
                className="w-4 h-4 accent-navy"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active staff member</Label>
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
            <AlertDialogDescription>This will remove the staff profile. The user account will remain but their role will revert to guest.</AlertDialogDescription>
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