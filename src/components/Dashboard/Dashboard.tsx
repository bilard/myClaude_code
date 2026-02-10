import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { settingsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Palette, LayoutTemplate, Image, Download, MessageSquare,
  FolderOpen, TrendingUp, ArrowRight, Clock, Sparkles, Plus
} from 'lucide-react';
import type { DashboardStats } from '../../types';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await settingsApi.getStats();
      return data;
    },
  });

  const statCards = [
    { label: 'Designs', value: stats?.counts.designs || 0, icon: Palette, color: 'from-blue-500 to-blue-600', link: '/designs' },
    { label: 'Templates', value: stats?.counts.templates || 0, icon: LayoutTemplate, color: 'from-purple-500 to-purple-600', link: '/templates' },
    { label: 'Médiathèque', value: stats?.counts.assets || 0, icon: Image, color: 'from-emerald-500 to-emerald-600', link: '/assets' },
    { label: 'Exports', value: stats?.counts.exports || 0, icon: Download, color: 'from-amber-500 to-amber-600', link: '/exports' },
    { label: 'Commentaires', value: stats?.counts.comments || 0, icon: MessageSquare, color: 'from-pink-500 to-pink-600', link: '/comments' },
    { label: 'Dossiers', value: stats?.counts.folders || 0, icon: FolderOpen, color: 'from-cyan-500 to-cyan-600', link: '/assets' },
  ];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-surface-800 rounded-lg w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-surface-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Bonjour, {user?.displayName} <span className="inline-block animate-pulse-soft">&#9734;</span>
          </h1>
          <p className="text-surface-400 mt-1">Voici un aperçu de votre espace créatif</p>
        </div>
        <div className="flex gap-3">
          <Link to="/designs" className="btn-primary">
            <Plus className="w-5 h-5" />
            Nouveau design
          </Link>
          <Link to="/templates" className="btn-secondary">
            <LayoutTemplate className="w-5 h-5" />
            Templates
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              to={stat.link}
              className="stat-card group hover:scale-[1.02] transition-transform duration-200"
            >
              <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-3 shadow-lg group-hover:shadow-xl transition-shadow`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-surface-400 mt-0.5">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Designs */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-400" />
              Designs récents
            </h2>
            <Link to="/designs" className="btn-ghost text-sm">
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {stats?.recentDesigns?.length ? (
            <div className="space-y-3">
              {stats.recentDesigns.map((design) => (
                <Link
                  key={design.id}
                  to={`/designs/${design.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-700/30 transition-colors group"
                >
                  <div className="w-14 h-14 bg-surface-700 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    {design.thumbnailUrl ? (
                      <img src={design.thumbnailUrl} alt={design.title} className="w-full h-full object-cover" />
                    ) : (
                      <Palette className="w-6 h-6 text-surface-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-200 truncate group-hover:text-white transition-colors">
                      {design.title}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {new Date(design.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`badge ${design.status === 'completed' ? 'badge-success' : design.status === 'draft' ? 'badge-warning' : 'badge-info'}`}>
                    {design.status === 'draft' ? 'Brouillon' : design.status === 'completed' ? 'Terminé' : design.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Palette className="w-12 h-12 text-surface-600 mx-auto mb-3" />
              <p className="text-surface-400">Aucun design récent</p>
              <Link to="/designs" className="btn-primary mt-4 inline-flex">
                <Plus className="w-4 h-4" /> Créer un design
              </Link>
            </div>
          )}
        </div>

        {/* Recent Exports */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-brand-400" />
              Exports récents
            </h2>
            <Link to="/exports" className="btn-ghost text-sm">
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {stats?.recentExports?.length ? (
            <div className="space-y-3">
              {stats.recentExports.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-700/30 transition-colors"
                >
                  <div className="w-14 h-14 bg-surface-700 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Download className="w-6 h-6 text-surface-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-200 truncate">
                      {exp.design?.title || 'Export'}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      Format: {exp.format.toUpperCase()} &middot; {new Date(exp.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className={`badge ${exp.status === 'completed' ? 'badge-success' : exp.status === 'failed' ? 'badge-error' : 'badge-warning'}`}>
                    {exp.status === 'completed' ? 'Prêt' : exp.status === 'failed' ? 'Échec' : 'En cours'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Download className="w-12 h-12 text-surface-600 mx-auto mb-3" />
              <p className="text-surface-400">Aucun export récent</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-400" />
          Actions rapides
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Nouveau design', desc: 'Créer depuis zéro', icon: Plus, link: '/designs', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
            { label: 'Utiliser un template', desc: 'Autofill rapide', icon: LayoutTemplate, link: '/templates', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
            { label: 'Importer un média', desc: 'Image ou vidéo', icon: Image, link: '/assets', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            { label: 'Exporter', desc: 'PDF, PNG, JPG...', icon: Download, link: '/exports', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.link}
                className={`p-4 rounded-xl border ${action.color} hover:scale-[1.02] transition-all duration-200 group`}
              >
                <Icon className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-medium text-sm text-surface-200">{action.label}</p>
                <p className="text-xs text-surface-500 mt-0.5">{action.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
