import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { designsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Plus, Search, Palette, ExternalLink, Trash2, RefreshCw,
  Grid3X3, List, Filter, ChevronDown, X, Edit3, Eye
} from 'lucide-react';
import type { Design } from '../../types';

const DESIGN_PRESETS = [
  { label: 'Personnalisé', type: 'custom', width: 1920, height: 1080 },
  { label: 'Post Instagram', type: 'custom', width: 1080, height: 1080 },
  { label: 'Story Instagram', type: 'custom', width: 1080, height: 1920 },
  { label: 'Bannière Facebook', type: 'custom', width: 820, height: 312 },
  { label: 'Post Facebook', type: 'custom', width: 1200, height: 630 },
  { label: 'Post LinkedIn', type: 'custom', width: 1200, height: 627 },
  { label: 'Bannière YouTube', type: 'custom', width: 2560, height: 1440 },
  { label: 'Miniature YouTube', type: 'custom', width: 1280, height: 720 },
  { label: 'Affiche A4', type: 'custom', width: 2480, height: 3508 },
  { label: 'Carte de visite', type: 'custom', width: 1050, height: 600 },
  { label: 'Flyer', type: 'custom', width: 1275, height: 1875 },
  { label: 'Présentation 16:9', type: 'custom', width: 1920, height: 1080 },
];

export default function DesignList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDesign, setNewDesign] = useState({ title: '', width: 1920, height: 1080, description: '' });
  const [selectedPreset, setSelectedPreset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['designs', search],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const { data } = await designsApi.list(params);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => designsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs'] });
      setShowCreateModal(false);
      setNewDesign({ title: '', width: 1920, height: 1080, description: '' });
      toast.success('Design créé avec succès');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => designsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs'] });
      toast.success('Design supprimé');
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => designsApi.sync(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['designs'] });
      toast.success(`${res.data.synced} designs synchronisés`);
    },
    onError: () => toast.error('Erreur de synchronisation'),
  });

  const handleCreate = () => {
    const preset = DESIGN_PRESETS[selectedPreset];
    createMutation.mutate({
      title: newDesign.title || 'Sans titre',
      designType: 'custom',
      width: selectedPreset === 0 ? newDesign.width : preset.width,
      height: selectedPreset === 0 ? newDesign.height : preset.height,
      description: newDesign.description,
    });
  };

  const designs: Design[] = data?.designs || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mes Designs</h1>
          <p className="text-surface-400 mt-1">{data?.total || 0} designs au total</p>
        </div>
        <div className="flex gap-3">
          {user?.canvaConnected && (
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="btn-secondary"
            >
              <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Synchroniser
            </button>
          )}
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus className="w-5 h-5" />
            Nouveau design
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
            placeholder="Rechercher un design..."
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center bg-surface-800 rounded-xl border border-surface-700 p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-surface-700 text-white' : 'text-surface-400 hover:text-surface-300'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-surface-700 text-white' : 'text-surface-400 hover:text-surface-300'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse bg-surface-800 rounded-2xl h-64" />
          ))}
        </div>
      ) : designs.length === 0 ? (
        <div className="text-center py-16">
          <Palette className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Aucun design</h3>
          <p className="text-surface-400 mb-6">Créez votre premier design pour commencer</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary inline-flex">
            <Plus className="w-5 h-5" /> Créer un design
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {designs.map((design) => (
            <div key={design.id} className="group card p-0 overflow-hidden hover:border-brand-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/5">
              <Link to={`/designs/${design.id}`} className="block">
                <div className="aspect-video bg-surface-700/50 flex items-center justify-center overflow-hidden relative">
                  {design.thumbnailUrl ? (
                    <img src={design.thumbnailUrl} alt={design.title} className="w-full h-full object-cover" />
                  ) : (
                    <Palette className="w-10 h-10 text-surface-500" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 gap-2">
                    <span className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg text-white text-xs font-medium flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Voir
                    </span>
                  </div>
                </div>
              </Link>
              <div className="p-4">
                <h3 className="font-medium text-surface-200 truncate text-sm">{design.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className={`badge text-xs ${design.status === 'completed' ? 'badge-success' : design.status === 'draft' ? 'badge-warning' : 'badge-info'}`}>
                    {design.status === 'draft' ? 'Brouillon' : design.status === 'completed' ? 'Terminé' : design.status}
                  </span>
                  <div className="flex items-center gap-1">
                    {design.editUrl && (
                      <a href={design.editUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-surface-500 hover:text-brand-400 rounded-lg hover:bg-surface-700/50 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); deleteMutation.mutate(design.id); }}
                      className="p-1.5 text-surface-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {designs.map((design) => (
            <Link
              key={design.id}
              to={`/designs/${design.id}`}
              className="flex items-center gap-4 p-4 card hover:border-brand-500/30 transition-all"
            >
              <div className="w-16 h-12 bg-surface-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                {design.thumbnailUrl ? (
                  <img src={design.thumbnailUrl} alt={design.title} className="w-full h-full object-cover" />
                ) : (
                  <Palette className="w-5 h-5 text-surface-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-surface-200 truncate">{design.title}</p>
                <p className="text-xs text-surface-500">{design.width}×{design.height} &middot; {new Date(design.updatedAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <span className={`badge ${design.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                {design.status === 'draft' ? 'Brouillon' : design.status}
              </span>
              <button
                onClick={(e) => { e.preventDefault(); deleteMutation.mutate(design.id); }}
                className="p-2 text-surface-500 hover:text-red-400 rounded-lg hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-lg p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nouveau design</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-surface-400 hover:text-surface-200 rounded-lg hover:bg-surface-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Titre</label>
                <input
                  type="text"
                  value={newDesign.title}
                  onChange={(e) => setNewDesign({ ...newDesign, title: e.target.value })}
                  className="input-field"
                  placeholder="Mon nouveau design"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Format</label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {DESIGN_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPreset(idx)}
                      className={`p-3 rounded-xl border text-left transition-all text-sm ${selectedPreset === idx ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-surface-700 text-surface-400 hover:border-surface-600'}`}
                    >
                      <p className="font-medium text-xs">{preset.label}</p>
                      <p className="text-xs text-surface-500 mt-0.5">{preset.width}×{preset.height}</p>
                    </button>
                  ))}
                </div>
              </div>

              {selectedPreset === 0 && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-surface-300 mb-1.5">Largeur (px)</label>
                    <input
                      type="number"
                      value={newDesign.width}
                      onChange={(e) => setNewDesign({ ...newDesign, width: Number(e.target.value) })}
                      className="input-field"
                      min={1}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-surface-300 mb-1.5">Hauteur (px)</label>
                    <input
                      type="number"
                      value={newDesign.height}
                      onChange={(e) => setNewDesign({ ...newDesign, height: Number(e.target.value) })}
                      className="input-field"
                      min={1}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Description (optionnel)</label>
                <textarea
                  value={newDesign.description}
                  onChange={(e) => setNewDesign({ ...newDesign, description: e.target.value })}
                  className="input-field h-20 resize-none"
                  placeholder="Description du design..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1 justify-center">
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="btn-primary flex-1 justify-center"
              >
                {createMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5" /> Créer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
