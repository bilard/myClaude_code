import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesApi } from '../../api/client';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Zap, Edit3, Trash2, LayoutTemplate, Clock,
  Tag, BookOpen, Check, X, Plus, Palette
} from 'lucide-react';
import type { Template } from '../../types';

export default function TemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [showAutofillModal, setShowAutofillModal] = useState(false);
  const [autofillTitle, setAutofillTitle] = useState('');
  const [autofillData, setAutofillData] = useState<Record<string, string>>({});

  const { data: template, isLoading } = useQuery<Template>({
    queryKey: ['template', id],
    queryFn: async () => {
      const { data } = await templatesApi.get(id!);
      setName(data.name);
      return data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => templatesApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', id] });
      setEditingName(false);
      toast.success('Template mis à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => templatesApi.delete(id!),
    onSuccess: () => {
      toast.success('Template supprimé');
      navigate('/templates');
    },
  });

  const autofillMutation = useMutation({
    mutationFn: (data: { title: string; data: Record<string, string> }) => templatesApi.autofill(id!, data),
    onSuccess: (res) => {
      setShowAutofillModal(false);
      if (res.data.design) {
        toast.success('Design créé à partir du template');
        navigate(`/designs/${res.data.design.id}`);
      } else {
        toast.error('Erreur lors de l\'autofill');
      }
    },
    onError: () => toast.error('Erreur lors de l\'autofill'),
  });

  // Parse dataset fields
  let datasetFields: Array<{ name: string; type: string }> = [];
  if (template?.datasetFields) {
    try {
      const parsed = JSON.parse(template.datasetFields);
      datasetFields = parsed.data_fields || parsed || [];
    } catch {}
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-surface-800 rounded-lg w-48" />
        <div className="h-64 bg-surface-800 rounded-2xl" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-16">
        <LayoutTemplate className="w-16 h-16 text-surface-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Template introuvable</h3>
        <Link to="/templates" className="btn-primary inline-flex mt-4">
          <ArrowLeft className="w-5 h-5" /> Retour aux templates
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/templates" className="p-2 text-surface-400 hover:text-surface-200 rounded-lg hover:bg-surface-800">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field text-lg font-bold py-1"
                  autoFocus
                />
                <button onClick={() => updateMutation.mutate({ name })} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg">
                  <Check className="w-5 h-5" />
                </button>
                <button onClick={() => { setEditingName(false); setName(template.name); }} className="p-2 text-surface-400 hover:bg-surface-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-white flex items-center gap-2 cursor-pointer group" onClick={() => setEditingName(true)}>
                {template.name}
                <Edit3 className="w-4 h-4 text-surface-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h1>
            )}
            <div className="flex items-center gap-3 mt-1 text-sm text-surface-400">
              {template.category && (
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  {template.category}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {template.usageCount} utilisations
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(template.updatedAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {template.canvaTemplateId && (
            <button onClick={() => setShowAutofillModal(true)} className="btn-primary">
              <Zap className="w-4 h-4" /> Autofill
            </button>
          )}
          <button onClick={() => deleteMutation.mutate()} className="btn-danger">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Preview */}
          <div className="card p-0 overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-purple-600/20 to-brand-600/20 flex items-center justify-center">
              {template.thumbnailUrl ? (
                <img src={template.thumbnailUrl} alt={template.name} className="max-w-full max-h-full object-contain" />
              ) : (
                <LayoutTemplate className="w-16 h-16 text-surface-600" />
              )}
            </div>
          </div>

          {/* Dataset Fields */}
          {datasetFields.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-400" />
                Champs de données
              </h3>
              <div className="space-y-2">
                {datasetFields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400">
                      {field.type === 'image' ? '🖼' : field.type === 'text' ? 'Aa' : '📊'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-200">{field.name}</p>
                      <p className="text-xs text-surface-500">{field.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {template.description && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
              <p className="text-surface-300">{template.description}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Informations</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Catégorie</span>
                <span className="text-surface-200">{template.category || 'Non classé'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Utilisations</span>
                <span className="text-surface-200">{template.usageCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Public</span>
                <span className="text-surface-200">{template.isPublic ? 'Oui' : 'Non'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Canva ID</span>
                <span className="text-surface-200 font-mono text-xs truncate ml-2">{template.canvaTemplateId || 'Local'}</span>
              </div>
            </div>
          </div>

          {/* Generated Designs */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-brand-400" /> Designs générés
            </h3>
            {template.templateDesigns && template.templateDesigns.length > 0 ? (
              <div className="space-y-2">
                {template.templateDesigns.map((td) => (
                  <Link
                    key={td.id}
                    to={`/designs/${td.designId}`}
                    className="block p-2.5 rounded-lg bg-surface-800/50 hover:bg-surface-700/50 transition-colors"
                  >
                    <p className="text-sm font-medium text-surface-200">{td.design?.title || 'Design'}</p>
                    <p className="text-xs text-surface-500">{new Date(td.createdAt).toLocaleDateString('fr-FR')}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-500">Aucun design généré</p>
            )}
          </div>
        </div>
      </div>

      {/* Autofill Modal */}
      {showAutofillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowAutofillModal(false)}>
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-lg p-6 animate-slide-up max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> Autofill
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Titre du design</label>
                <input
                  type="text"
                  value={autofillTitle}
                  onChange={(e) => setAutofillTitle(e.target.value)}
                  className="input-field"
                  placeholder="Titre du nouveau design"
                />
              </div>

              {datasetFields.length > 0 ? (
                datasetFields.map((field, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-surface-300 mb-1.5">{field.name} ({field.type})</label>
                    {field.type === 'text' ? (
                      <input
                        type="text"
                        value={autofillData[field.name] || ''}
                        onChange={(e) => setAutofillData({ ...autofillData, [field.name]: e.target.value })}
                        className="input-field"
                        placeholder={`Valeur pour ${field.name}`}
                      />
                    ) : field.type === 'image' ? (
                      <input
                        type="url"
                        value={autofillData[field.name] || ''}
                        onChange={(e) => setAutofillData({ ...autofillData, [field.name]: e.target.value })}
                        className="input-field"
                        placeholder="URL de l'image"
                      />
                    ) : (
                      <textarea
                        value={autofillData[field.name] || ''}
                        onChange={(e) => setAutofillData({ ...autofillData, [field.name]: e.target.value })}
                        className="input-field h-20 resize-none"
                        placeholder={`Données pour ${field.name}`}
                      />
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-surface-400 p-4 bg-surface-800/50 rounded-xl">
                  Aucun champ de données défini. Le template sera utilisé tel quel.
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAutofillModal(false)} className="btn-secondary flex-1 justify-center">Annuler</button>
              <button
                onClick={() => autofillMutation.mutate({ title: autofillTitle || template.name, data: autofillData })}
                disabled={autofillMutation.isPending}
                className="btn-primary flex-1 justify-center"
              >
                {autofillMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-5 h-5" /> Générer
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
