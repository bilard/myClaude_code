import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exportsApi } from '../../api/client';
import toast from 'react-hot-toast';
import {
  Download, Trash2, ExternalLink, RefreshCw, FileText,
  Image, Film, Presentation, FileType, Clock, CheckCircle, XCircle
} from 'lucide-react';
import type { Export } from '../../types';

function getFormatIcon(format: string) {
  switch (format) {
    case 'pdf': return <FileText className="w-5 h-5 text-red-400" />;
    case 'jpg':
    case 'png':
    case 'gif': return <Image className="w-5 h-5 text-blue-400" />;
    case 'mp4': return <Film className="w-5 h-5 text-purple-400" />;
    case 'pptx': return <Presentation className="w-5 h-5 text-amber-400" />;
    default: return <FileType className="w-5 h-5 text-surface-400" />;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <span className="badge-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Prêt</span>;
    case 'failed':
      return <span className="badge-error flex items-center gap-1"><XCircle className="w-3 h-3" /> Échec</span>;
    case 'pending':
      return <span className="badge-warning flex items-center gap-1"><Clock className="w-3 h-3" /> En cours</span>;
    default:
      return <span className="badge-info">{status}</span>;
  }
}

export default function ExportList() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['exports'],
    queryFn: async () => {
      const { data } = await exportsApi.list();
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => exportsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      toast.success('Export supprimé');
    },
  });

  const refreshMutation = useMutation({
    mutationFn: (id: string) => exportsApi.getStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      toast.success('Statut mis à jour');
    },
  });

  const exports: Export[] = data?.exports || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Exports</h1>
        <p className="text-surface-400 mt-1">{data?.total || 0} exports au total</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-surface-800 rounded-2xl h-20" />
          ))}
        </div>
      ) : exports.length === 0 ? (
        <div className="text-center py-16">
          <Download className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Aucun export</h3>
          <p className="text-surface-400">Les exports de vos designs apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exports.map((exp) => (
            <div key={exp.id} className="card flex items-center gap-4 p-4">
              <div className="w-12 h-12 bg-surface-700 rounded-xl flex items-center justify-center flex-shrink-0">
                {getFormatIcon(exp.format)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-surface-200">{exp.design?.title || 'Export'}</p>
                <div className="flex items-center gap-3 mt-1 text-sm text-surface-500">
                  <span>Format: <span className="text-surface-300 font-medium">{exp.format.toUpperCase()}</span></span>
                  {exp.quality && <span>Qualité: {exp.quality}</span>}
                  <span>{new Date(exp.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  {exp.expiresAt && (
                    <span className="text-xs">
                      Expire: {new Date(exp.expiresAt).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(exp.status)}
                {exp.status === 'pending' && (
                  <button
                    onClick={() => refreshMutation.mutate(exp.id)}
                    className="p-2 text-surface-400 hover:text-surface-200 rounded-lg hover:bg-surface-800"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                {exp.downloadUrl && (
                  <a
                    href={exp.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary py-2 px-3 text-sm"
                  >
                    <Download className="w-4 h-4" /> Télécharger
                  </a>
                )}
                <button
                  onClick={() => deleteMutation.mutate(exp.id)}
                  className="p-2 text-surface-500 hover:text-red-400 rounded-lg hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
