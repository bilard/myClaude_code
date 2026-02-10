import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { designsApi, exportsApi, commentsApi } from '../../api/client';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ExternalLink, Download, MessageSquare, Edit3,
  Trash2, Palette, Clock, Tag, Layers, Send, X, Check
} from 'lucide-react';
import type { Design, Comment } from '../../types';

const EXPORT_FORMATS = ['pdf', 'jpg', 'png', 'gif', 'pptx', 'mp4'];

export default function DesignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('png');
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [newComment, setNewComment] = useState('');

  const { data: design, isLoading } = useQuery<Design>({
    queryKey: ['design', id],
    queryFn: async () => {
      const { data } = await designsApi.get(id!);
      setTitle(data.title);
      return data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => designsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design', id] });
      setEditingTitle(false);
      toast.success('Design mis à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => designsApi.delete(id!),
    onSuccess: () => {
      toast.success('Design supprimé');
      navigate('/designs');
    },
  });

  const exportMutation = useMutation({
    mutationFn: (format: string) => exportsApi.create({ designId: id!, format }),
    onSuccess: (res) => {
      setShowExportModal(false);
      if (res.data.downloadUrl) {
        toast.success('Export prêt !');
      } else {
        toast.success('Export en cours de préparation...');
      }
      queryClient.invalidateQueries({ queryKey: ['design', id] });
    },
    onError: () => toast.error('Erreur lors de l\'export'),
  });

  const commentMutation = useMutation({
    mutationFn: (message: string) => commentsApi.create({ designId: id!, message }),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['design', id] });
      toast.success('Commentaire ajouté');
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-surface-800 rounded-lg w-48" />
        <div className="h-96 bg-surface-800 rounded-2xl" />
      </div>
    );
  }

  if (!design) {
    return (
      <div className="text-center py-16">
        <Palette className="w-16 h-16 text-surface-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Design introuvable</h3>
        <Link to="/designs" className="btn-primary inline-flex mt-4">
          <ArrowLeft className="w-5 h-5" /> Retour aux designs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/designs" className="p-2 text-surface-400 hover:text-surface-200 rounded-lg hover:bg-surface-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field text-lg font-bold py-1"
                  autoFocus
                />
                <button onClick={() => updateMutation.mutate({ title })} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg">
                  <Check className="w-5 h-5" />
                </button>
                <button onClick={() => { setEditingTitle(false); setTitle(design.title); }} className="p-2 text-surface-400 hover:bg-surface-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-white flex items-center gap-2 cursor-pointer group" onClick={() => setEditingTitle(true)}>
                {design.title}
                <Edit3 className="w-4 h-4 text-surface-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h1>
            )}
            <div className="flex items-center gap-3 mt-1 text-sm text-surface-400">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {design.width}×{design.height}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(design.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className={`badge ${design.status === 'completed' ? 'badge-success' : design.status === 'draft' ? 'badge-warning' : 'badge-info'}`}>
                {design.status === 'draft' ? 'Brouillon' : design.status === 'completed' ? 'Terminé' : design.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {design.editUrl && (
            <a href={design.editUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <ExternalLink className="w-4 h-4" /> Ouvrir dans Canva
            </a>
          )}
          <button onClick={() => setShowExportModal(true)} className="btn-secondary">
            <Download className="w-4 h-4" /> Exporter
          </button>
          <button onClick={() => deleteMutation.mutate()} className="btn-danger">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="card p-0 overflow-hidden">
            <div className="aspect-video bg-surface-800 flex items-center justify-center">
              {design.thumbnailUrl ? (
                <img src={design.thumbnailUrl} alt={design.title} className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-center">
                  <Palette className="w-16 h-16 text-surface-600 mx-auto mb-3" />
                  <p className="text-surface-400">Aperçu non disponible</p>
                  {design.editUrl && (
                    <a href={design.editUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 inline-flex">
                      <ExternalLink className="w-4 h-4" /> Éditer dans Canva
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Design Info */}
          <div className="card mt-4">
            <h3 className="text-lg font-semibold text-white mb-4">Informations</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-surface-500 mb-1">Type</p>
                <p className="text-sm text-surface-200 font-medium">{design.designType}</p>
              </div>
              <div>
                <p className="text-xs text-surface-500 mb-1">Dimensions</p>
                <p className="text-sm text-surface-200 font-medium">{design.width}×{design.height}px</p>
              </div>
              <div>
                <p className="text-xs text-surface-500 mb-1">Créé le</p>
                <p className="text-sm text-surface-200 font-medium">
                  {new Date(design.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <p className="text-xs text-surface-500 mb-1">Canva ID</p>
                <p className="text-sm text-surface-200 font-medium font-mono truncate">
                  {design.canvaDesignId || 'Local'}
                </p>
              </div>
            </div>

            {design.description && (
              <div className="mt-4 pt-4 border-t border-surface-700/50">
                <p className="text-xs text-surface-500 mb-1">Description</p>
                <p className="text-sm text-surface-300">{design.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Exports */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Download className="w-4 h-4 text-brand-400" /> Exports
            </h3>
            {design.exports && design.exports.length > 0 ? (
              <div className="space-y-2">
                {design.exports.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-800/50">
                    <div>
                      <p className="text-sm font-medium text-surface-200">{exp.format.toUpperCase()}</p>
                      <p className="text-xs text-surface-500">{new Date(exp.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    {exp.downloadUrl ? (
                      <a href={exp.downloadUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-brand-400 hover:bg-brand-500/10 rounded-lg">
                        <Download className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="badge-warning text-xs">{exp.status}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-500">Aucun export</p>
            )}
          </div>

          {/* Comments */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-400" /> Commentaires
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {design.comments && design.comments.length > 0 ? (
                design.comments.map((comment: Comment) => (
                  <div key={comment.id} className="p-2.5 rounded-lg bg-surface-800/50">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-brand-500/30 rounded-full flex items-center justify-center text-brand-400 text-xs font-medium">
                        {comment.user?.displayName?.charAt(0) || '?'}
                      </div>
                      <span className="text-xs font-medium text-surface-300">{comment.user?.displayName}</span>
                      <span className="text-xs text-surface-500">{new Date(comment.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <p className="text-sm text-surface-300 pl-8">{comment.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-surface-500">Aucun commentaire</p>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="input-field text-sm py-2"
                placeholder="Ajouter un commentaire..."
                onKeyDown={(e) => e.key === 'Enter' && newComment && commentMutation.mutate(newComment)}
              />
              <button
                onClick={() => newComment && commentMutation.mutate(newComment)}
                disabled={!newComment || commentMutation.isPending}
                className="p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => updateMutation.mutate({ status: design.status === 'draft' ? 'completed' : 'draft' })}
                className="btn-secondary w-full justify-center text-sm"
              >
                {design.status === 'draft' ? 'Marquer comme terminé' : 'Repasser en brouillon'}
              </button>
              <button onClick={() => setShowExportModal(true)} className="btn-secondary w-full justify-center text-sm">
                <Download className="w-4 h-4" /> Exporter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowExportModal(false)}>
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Exporter le design</h2>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {EXPORT_FORMATS.map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setExportFormat(fmt)}
                  className={`p-3 rounded-xl border text-center transition-all ${exportFormat === fmt ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-surface-700 text-surface-400 hover:border-surface-600'}`}
                >
                  <p className="font-bold text-lg">{fmt.toUpperCase()}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowExportModal(false)} className="btn-secondary flex-1 justify-center">Annuler</button>
              <button
                onClick={() => exportMutation.mutate(exportFormat)}
                disabled={exportMutation.isPending}
                className="btn-primary flex-1 justify-center"
              >
                {exportMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Download className="w-5 h-5" /> Exporter
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
