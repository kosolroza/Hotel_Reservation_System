
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, Star, LayoutGrid, List, Wifi, Waves, Dumbbell, Coffee, Car, Wind, Tv, UtensilsCrossed, Sparkles, ShieldCheck, BedDouble, Bath } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminService } from '../../services/adminService';
import { AdminTable } from '../../components/admin/AdminTable';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '../../components/ui/alert-dialog';
import { toast } from '../../components/ui/toast';
import { Amenity } from '../../types';

const schema = z.object({ name: z.string().min(1), icon: z.string().min(1) });
type FormData = z.infer<typeof schema>;

const ICON_OPTIONS = [
  { key: 'wifi', label: 'WiFi', Icon: Wifi },
  { key: 'pool', label: 'Pool', Icon: Waves },
  { key: 'gym', label: 'Gym', Icon: Dumbbell },
  { key: 'breakfast', label: 'Breakfast', Icon: Coffee },
  { key: 'parking', label: 'Parking', Icon: Car },
  { key: 'ac', label: 'AC', Icon: Wind },
  { key: 'tv', label: 'TV', Icon: Tv },
  { key: 'restaurant', label: 'Restaurant', Icon: UtensilsCrossed },
  { key: 'spa', label: 'Spa', Icon: Sparkles },
  { key: 'security', label: 'Security', Icon: ShieldCheck },
  { key: 'bed', label: 'Bed', Icon: BedDouble },
  { key: 'bath', label: 'Bath', Icon: Bath },
];

function getIconComponent(iconKey: string) {
  const found = ICON_OPTIONS.find(i => i.key === iconKey);
  return found ? found.Icon : Star;
}

export default function AdminAmenities() {
  const qc = useQueryClient();
  const [editAmenity, setEditAmenity] = useState<Amenity | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: amenities, isLoading } = useQuery({ queryKey: ['admin-amenities'], queryFn: adminService.getAmenities });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const selectedIcon = watch('icon');

  function openCreate() { reset({ name: '', icon: 'wifi' }); setEditAmenity(null); setShowForm(true); }
  function openEdit(a: Amenity) { setEditAmenity(a); reset({ name: a.name, icon: a.icon }); setShowForm(true); }

  async function onSubmit(data: FormData) {
    try {
      if (editAmenity) { await adminService.updateAmenity(editAmenity.id, data); toast.success('Updated!'); }
      else { await adminService.createAmenity(data); toast.success('Created!'); }
      qc.invalidateQueries({ queryKey: ['admin-amenities'] });
      setShowForm(false);
    } catch { toast.error('Failed to save.'); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await adminService.deleteAmenity(deleteId); toast.success('Deleted.'); qc.invalidateQueries({ queryKey: ['admin-amenities'] }); }
    catch { toast.error('Cannot delete — rooms use this amenity.'); }
    finally { setDeleteId(null); }
  }

  const filtered = useMemo(() => {
    return (amenities || []).filter(a =>
      !search || a.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [amenities, search]);

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (a: Amenity) => {
        const Icon = getIconComponent(a.icon);
        return (
          <div className="flex items-center gap-2">
            <div className="bg-navy/10 p-1.5 rounded-lg">
              <Icon className="h-4 w-4 text-navy" />
            </div>
            <span className="font-medium">{a.name}</span>
          </div>
        );
      }
    },
    { key: 'icon', label: 'Icon Key', render: (a: Amenity) => <span className="font-mono text-xs text-gray-400">{a.icon}</span> },
    {
      key: 'room_count', label: 'Rooms Using',
      render: (a: Amenity) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-navy/10 text-navy">
          {a.room_count || 0} rooms
        </span>
      )
    },
    {
      key: 'actions', label: 'Actions',
      render: (a: Amenity) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(a)} className="text-navy hover:text-gold"><Edit className="h-4 w-4" /></button>
          <button onClick={() => setDeleteId(a.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-navy">Amenities</h1>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Amenity
        </Button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search amenities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>

        {/* View Toggle */}
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-navy text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-navy text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
          <Star className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium text-gray-500">No amenities found</p>
          <p className="text-sm mt-1">Try a different search or add a new amenity.</p>
          <Button onClick={openCreate} className="mt-4 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Amenity
          </Button>
        </div>
      )}

      {/* Grid View */}
      {!isLoading && filtered.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(a => {
            const Icon = getIconComponent(a.icon);
            return (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-3 hover:shadow-md hover:border-navy/30 transition-all group">
                <div className="bg-navy/10 group-hover:bg-navy/20 p-3 rounded-xl transition-colors">
                  <Icon className="h-6 w-6 text-navy" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm text-navy">{a.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.room_count || 0} rooms</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(a)} className="text-navy hover:text-gold"><Edit className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteId(a.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}

          {/* Add Card
          <button
            onClick={openCreate}
            className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-navy/40 hover:bg-navy/5 transition-all text-gray-400 hover:text-navy"
          >
            <Plus className="h-6 w-6" />
            <span className="text-xs font-medium">Add New</span>
          </button> */}
        </div>
      )}

      {/* List View */}
      {!isLoading && filtered.length > 0 && viewMode === 'list' && (
        <AdminTable columns={columns} data={filtered} loading={isLoading} keyField="id" />
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editAmenity ? 'Edit Amenity' : 'Add Amenity'}</DialogTitle></DialogHeader>
          <form className="space-y-5">
            <div>
              <Label>Name</Label>
              <Input {...register('name')} className="mt-1" placeholder="e.g. Free WiFi" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Icon Picker */}
            <div>
              <Label>Icon</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {ICON_OPTIONS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setValue('icon', key)}
                    title={label}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                      selectedIcon === key
                        ? 'border-navy bg-navy/10 text-navy'
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
              <input type="hidden" {...register('icon')} />
              {errors.icon && <p className="text-red-500 text-xs mt-1">{errors.icon.message}</p>}
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editAmenity ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Amenity?</AlertDialogTitle>
            <AlertDialogDescription>Only possible if no rooms use this amenity.</AlertDialogDescription>
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