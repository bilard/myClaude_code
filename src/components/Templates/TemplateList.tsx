import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { templatesApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Plus, Search, LayoutTemplate, RefreshCw, Trash2, X,
  Grid3X3, List, Tag, Eye, Zap, BookOpen
} from 'lucide-react';
import type { Template } from '../../types';

const CATEGORIES = [
  { value: '', label: 'Toutes' },
  { value: 'brand', label: 'Brand' },
  { value: 'social', label: 'Réseaux sociaux' },
  { value: 'print', label: 'Impression' },
  { value: 'presentation', label: 'Présentations' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'ecommerce', label: 'E-commerce' },
];

export default function TemplateList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '', category: 'social' });

  const { data, isLoading } = useQuery({
    queryKey: ['templates', search, category],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const { data } = await templatesApi.list(params);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => templatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setShowCreateModal(false);
      setNewTemplate({ name: '', description: '', category: 'social' });
      toast.success('Template créé');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template supprimé');
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => templatesApi.syncBrand(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success(`${res.data.synced} templates synchronisés`);
    },
    onError: () => toast.error('Erreur de synchronisation. Vérifiez votre plan Canva Enterprise.'),
  });

  const templates: Template[] = data?.templates || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Templates</h1>
          <p className="text-surface-400 mt-1">{data?.total || 0} templates disponibles</p>
        </div>
        <div className="flex gap-3">
          {user?.canvaConnected && (
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="btn-secondary"
            >
              <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Sync Brand
            </button>
          )}
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus className="w-5 h-5" /> Nouveau template
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
            placeholder="Rechercher un template..."
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                category === cat.value
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                  : 'bg-surface-800 text-surface-400 border border-surface-700 hover:border-surface-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex items-center bg-surface-800 rounded-xl border border-surface-700 p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-surface-700 text-white' : 'text-surface-400'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-surface-700 text-white' : 'text-surface-400'}`}
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
      ) : templates.length === 0 ? (
        <div className="text-center py-16">
          <LayoutTemplate className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Aucun template</h3>
          <p className="text-surface-400 mb-6">Créez ou synchronisez des templates pour commencer</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus className="w-5 h-5" /> Créer un template
            </button>
            {user?.canvaConnected && (
              <button onClick={() => syncMutation.mutate()} className="btn-secondary">
                <RefreshCw className="w-4 h-4" /> Synchroniser
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="group card p-0 overflow-hidden hover:border-brand-500/30 transition-all duration-200">
              <Link to={`/templates/${template.id}`} className="block">
                <div className="aspect-video bg-gradient-to-br from-purple-600/20 to-brand-600/20 flex items-center justify-center overflow-hidden relative">
                  {template.thumbnailUrl ? (
                    <img src={template.thumbnailUrl} alt={template.name} className="w-full h-full object-cover" />
                  ) : (
                    <LayoutTemplate className="w-10 h-10 text-surface-500" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 gap-2">
                    <span className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg text-white text-xs font-medium flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Voir
                    </span>
                    <span className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg text-white text-xs font-medium flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Autofill
                    </span>
                  </div>
                </div>
              </Link>
              <div className="p-4">
                <h3 className="font-medium text-surface-200 truncate text-sm">{template.name}</h3>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {template.category && (
                      <span className="badge-info text-xs">{template.category}</span>
                    )}
                    <span className="text-xs text-surface-500">{template.usageCount} utilisations</span>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); deleteMutation.mutate(template.id); }}
                    className="p-1.5 text-surface-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <Link
              key={template.id}
              to={`/templates/${template.id}`}
              className="flex items-center gap-4 p-4 card hover:border-brand-500/30 transition-all"
            >
              <div className="w-16 h-12 bg-surface-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                {template.thumbnailUrl ? (
                  <img src={template.thumbnailUrl} alt={template.name} className="w-full h-full object-cover" />
                ) : (
                  <LayoutTemplate className="w-5 h-5 text-surface-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-surface-200 truncate">{template.name}</p>
                <p className="text-xs text-surface-500">{template.category || 'Non classé'} &middot; {template.usageCount} utilisations</p>
              </div>
              {template.canvaTemplateId && <span className="badge-info text-xs">Canva</span>}
              <button
                onClick={(e) => { e.preventDefault(); deleteMutation.mutate(template.id); }}
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
              <h2 className="text-xl font-bold text-white">Nouveau template</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-surface-400 hover:text-surface-200 rounded-lg hover:bg-surface-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Nom du template</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="input-field"
                  placeholder="Mon template"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Catégorie</label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="input-field"
                >
                  {CATEGORIES.filter(c => c.value).map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Description</label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  className="input-field h-24 resize-none"
                  placeholder="Description du template..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1 justify-center">Annuler</button>
              <button
                onClick={() => createMutation.mutate(newTemplate)}
                disabled={!newTemplate.name || createMutation.isPending}
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
