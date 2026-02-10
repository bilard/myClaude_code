import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi, foldersApi } from '../../api/client';
import toast from 'react-hot-toast';
import {
  Upload, Search, Image, Trash2, X, Grid3X3, List, FolderOpen,
  Plus, File, Video, Music, FileText, Link2, Edit3, Check,
  FolderPlus, ChevronRight, ArrowLeft
} from 'lucide-react';
import type { Asset, Folder } from '../../types';

function getFileIcon(type: string) {
  switch (type) {
    case 'image': return <Image className="w-6 h-6 text-blue-400" />;
    case 'video': return <Video className="w-6 h-6 text-purple-400" />;
    case 'audio': return <Music className="w-6 h-6 text-pink-400" />;
    default: return <FileText className="w-6 h-6 text-surface-400" />;
  }
}

function formatSize(bytes?: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function AssetManager() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [urlUpload, setUrlUpload] = useState({ url: '', name: '' });
  const [newFolderName, setNewFolderName] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();
  const [dragOver, setDragOver] = useState(false);

  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ['assets', search, typeFilter, currentFolderId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (currentFolderId) params.folderId = currentFolderId;
      const { data } = await assetsApi.list(params);
      return data;
    },
  });

  const { data: folders } = useQuery({
    queryKey: ['folders', currentFolderId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (currentFolderId) params.parentId = currentFolderId;
      const { data } = await foldersApi.list(params);
      return data as Folder[];
    },
  });

  const { data: currentFolder } = useQuery({
    queryKey: ['folder', currentFolderId],
    queryFn: async () => {
      const { data } = await foldersApi.get(currentFolderId!);
      return data as Folder;
    },
    enabled: !!currentFolderId,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => assetsApi.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Fichier importé avec succès');
    },
    onError: () => toast.error('Erreur lors de l\'import'),
  });

  const urlUploadMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => assetsApi.uploadUrl(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowUrlModal(false);
      setUrlUpload({ url: '', name: '' });
      toast.success('Asset importé depuis l\'URL');
    },
    onError: () => toast.error('Erreur lors de l\'import'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset supprimé');
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => foldersApi.create({ name, parentId: currentFolderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setShowFolderModal(false);
      setNewFolderName('');
      toast.success('Dossier créé');
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => foldersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('Dossier supprimé');
    },
  });

  const handleFileUpload = (files: FileList) => {
    Array.from(files).forEach((file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      if (currentFolderId) formData.append('folderId', currentFolderId);
      uploadMutation.mutate(formData);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const assets: Asset[] = assetsData?.assets || [];
  const typeFilters = [
    { value: '', label: 'Tous' },
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Vidéos' },
    { value: 'audio', label: 'Audio' },
    { value: 'application', label: 'Documents' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Médiathèque</h1>
          <p className="text-surface-400 mt-1">{assetsData?.total || 0} fichiers</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowFolderModal(true)} className="btn-secondary">
            <FolderPlus className="w-4 h-4" /> Dossier
          </button>
          <button onClick={() => setShowUrlModal(true)} className="btn-secondary">
            <Link2 className="w-4 h-4" /> Depuis URL
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
            <Upload className="w-5 h-5" /> Importer
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.pptx,.doc,.docx"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Breadcrumb */}
      {currentFolderId && (
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setCurrentFolderId(undefined)} className="text-brand-400 hover:text-brand-300">
            Médiathèque
          </button>
          <ChevronRight className="w-4 h-4 text-surface-500" />
          {currentFolder?.parent && (
            <>
              <button onClick={() => setCurrentFolderId(currentFolder.parent!.id)} className="text-brand-400 hover:text-brand-300">
                {currentFolder.parent.name}
              </button>
              <ChevronRight className="w-4 h-4 text-surface-500" />
            </>
          )}
          <span className="text-surface-300">{currentFolder?.name}</span>
          <button onClick={() => setCurrentFolderId(currentFolder?.parentId || undefined)} className="ml-2 p-1 text-surface-400 hover:text-surface-200 rounded-lg hover:bg-surface-800">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
            placeholder="Rechercher un fichier..."
          />
        </div>
        <div className="flex gap-2">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                typeFilter === f.value
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                  : 'bg-surface-800 text-surface-400 border border-surface-700 hover:border-surface-600'
              }`}
            >
              {f.label}
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

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          dragOver ? 'border-brand-500 bg-brand-500/10' : 'border-surface-700 hover:border-surface-600'
        }`}
      >
        <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-brand-400' : 'text-surface-500'}`} />
        <p className="text-surface-300 font-medium">Glissez-déposez vos fichiers ici</p>
        <p className="text-surface-500 text-sm mt-1">ou cliquez sur "Importer" ci-dessus</p>
      </div>

      {/* Folders */}
      {folders && folders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-surface-400 mb-3 uppercase tracking-wider">Dossiers</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map((folder: Folder) => (
              <div
                key={folder.id}
                className="card p-4 cursor-pointer hover:border-brand-500/30 transition-all group"
                onClick={() => setCurrentFolderId(folder.id)}
              >
                <div className="flex items-center justify-between">
                  <FolderOpen className="w-8 h-8 text-amber-400" />
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFolderMutation.mutate(folder.id); }}
                    className="p-1 text-surface-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm font-medium text-surface-200 mt-2 truncate">{folder.name}</p>
                <p className="text-xs text-surface-500 mt-0.5">
                  {(folder._count?.designs || 0) + (folder._count?.assets || 0)} éléments
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assets */}
      {assetsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse bg-surface-800 rounded-2xl h-40" />
          ))}
        </div>
      ) : assets.length === 0 && (!folders || folders.length === 0) ? (
        <div className="text-center py-12">
          <Image className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Médiathèque vide</h3>
          <p className="text-surface-400 mb-6">Importez vos premiers fichiers</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {assets.map((asset) => (
            <div key={asset.id} className="group card p-0 overflow-hidden hover:border-brand-500/30 transition-all">
              <div className="aspect-square bg-surface-800 flex items-center justify-center overflow-hidden relative">
                {asset.thumbnailUrl || (asset.type === 'image' && asset.url) ? (
                  <img src={asset.thumbnailUrl || asset.url} alt={asset.name} className="w-full h-full object-cover" />
                ) : (
                  getFileIcon(asset.type)
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => deleteMutation.mutate(asset.id)}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-surface-300 truncate">{asset.name}</p>
                <p className="text-xs text-surface-500 mt-0.5">{formatSize(asset.size)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => (
            <div key={asset.id} className="flex items-center gap-4 p-3 card hover:border-brand-500/30 transition-all">
              <div className="w-12 h-12 bg-surface-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                {asset.thumbnailUrl ? (
                  <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover" />
                ) : (
                  getFileIcon(asset.type)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-surface-200 truncate text-sm">{asset.name}</p>
                <p className="text-xs text-surface-500">{asset.type} &middot; {formatSize(asset.size)} &middot; {new Date(asset.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <span className={`badge text-xs ${asset.uploadStatus === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                {asset.uploadStatus === 'completed' ? 'OK' : asset.uploadStatus}
              </span>
              <button onClick={() => deleteMutation.mutate(asset.id)} className="p-2 text-surface-500 hover:text-red-400 rounded-lg hover:bg-red-500/10">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* URL Upload Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowUrlModal(false)}>
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Importer depuis une URL</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">URL du fichier</label>
                <input
                  type="url"
                  value={urlUpload.url}
                  onChange={(e) => setUrlUpload({ ...urlUpload, url: e.target.value })}
                  className="input-field"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Nom</label>
                <input
                  type="text"
                  value={urlUpload.name}
                  onChange={(e) => setUrlUpload({ ...urlUpload, name: e.target.value })}
                  className="input-field"
                  placeholder="Mon image"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowUrlModal(false)} className="btn-secondary flex-1 justify-center">Annuler</button>
              <button
                onClick={() => urlUploadMutation.mutate({ ...urlUpload, folderId: currentFolderId })}
                disabled={!urlUpload.url || !urlUpload.name || urlUploadMutation.isPending}
                className="btn-primary flex-1 justify-center"
              >
                <Upload className="w-5 h-5" /> Importer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowFolderModal(false)}>
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Nouveau dossier</h2>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="input-field"
              placeholder="Nom du dossier"
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowFolderModal(false)} className="btn-secondary flex-1 justify-center">Annuler</button>
              <button
                onClick={() => createFolderMutation.mutate(newFolderName)}
                disabled={!newFolderName || createFolderMutation.isPending}
                className="btn-primary flex-1 justify-center"
              >
                <FolderPlus className="w-5 h-5" /> Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
