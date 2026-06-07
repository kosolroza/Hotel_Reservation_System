import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { AdminTable } from '../../components/admin/AdminTable';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from '../../components/ui/toast';
import { formatDate } from '../../utils/dateUtils';
import { User } from '../../types';
import { useForm } from 'react-hook-form';

export default function AdminGuests() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);
  const [editMode, setEditMode] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-guests', { page, search }],
    queryFn: () => adminService.getGuests({ page, per_page: 20, search }),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Partial<User>>();

  function openGuest(guest: User) {
    setSelected(guest);
    reset(guest);
    setEditMode(false);
  }

  async function onSave(data: Partial<User>) {
    if (!selected) return;
    try {
      await adminService.updateGuest(selected.id, data);
      toast.success('Guest updated!');
      qc.invalidateQueries({ queryKey: ['admin-guests'] });
      setSelected(null);
    } catch { toast.error('Failed to update.'); }
  }

  const columns = [
    { key: 'name', label: 'Name', render: (g: User) => `${g.first_name} ${g.last_name}` },
    { key: 'email', label: 'Email' },
    { key: 'phone_number', label: 'Phone', render: (g: User) => g.phone || '—' },
    { key: 'nationality', label: 'Nationality', render: (g: User) => g.nationality || '—' },
    { key: 'created_at', label: 'Member Since', render: (g: User) => formatDate(g.created_at) },
  ];

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl text-navy">Guest Management</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Search guests..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <AdminTable
        columns={columns}
        data={(data?.data || [])}
        loading={isLoading}
        keyField="id"
        onRowClick={(row) => openGuest(row as unknown as User)}
      />

      {(data?.total_pages || 1) > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
          <span className="flex items-center px-4 text-sm">{page} / {data?.total_pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === data?.total_pages}>Next</Button>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.first_name} {selected?.last_name}</DialogTitle>
          </DialogHeader>
          {selected && !editMode && (
            <div className="space-y-3 text-sm">
              {[
                ['Email', selected.email],
                ['Phone', selected.phone || '—'],
                ['Address', selected.address || '—'],
                ['Nationality', selected.nationality || '—'],
                ['Gender', selected.gender || '—'],
                ['Passport #', selected.passport_number || '—'],
                ['Date of Birth', selected.date_of_birth ? formatDate(selected.date_of_birth) : '—'],
                ['Member Since', formatDate(selected.created_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-4">
                  <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={() => setEditMode(true)}>Edit Guest</Button>
              </div>
            </div>
          )}
          {selected && editMode && (
            <form onSubmit={handleSubmit(onSave)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {(['first_name', 'last_name', 'phone', 'address', 'nationality', 'passport_number'] as const).map(f => (
                  <div key={f}>
                    <Label>{f.replace(/_/g, ' ')}</Label>
                    <Input {...register(f)} className="mt-1" />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
