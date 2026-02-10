import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { designsApi, commentsApi } from '../../api/client';
import toast from 'react-hot-toast';
import {
  MessageSquare, Send, Trash2, Reply, Palette,
  Clock, User, ChevronDown, ChevronUp
} from 'lucide-react';
import type { Design, Comment } from '../../types';

export default function CommentView() {
  const queryClient = useQueryClient();
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newComment, setNewComment] = useState('');

  const { data: designsData } = useQuery({
    queryKey: ['designs-for-comments'],
    queryFn: async () => {
      const { data } = await designsApi.list({ limit: '100' });
      return data;
    },
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', selectedDesignId],
    queryFn: async () => {
      const { data } = await commentsApi.listByDesign(selectedDesignId!);
      return data as Comment[];
    },
    enabled: !!selectedDesignId,
  });

  const createMutation = useMutation({
    mutationFn: (message: string) => commentsApi.create({ designId: selectedDesignId!, message }),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', selectedDesignId] });
      toast.success('Commentaire ajouté');
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => commentsApi.reply(id, message),
    onSuccess: () => {
      setReplyTo(null);
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['comments', selectedDesignId] });
      toast.success('Réponse ajoutée');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => commentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', selectedDesignId] });
      toast.success('Commentaire supprimé');
    },
  });

  const designs: Design[] = designsData?.designs || [];

  const toggleThread = (id: string) => {
    const next = new Set(expandedThreads);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedThreads(next);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Commentaires</h1>
        <p className="text-surface-400 mt-1">Gérez les commentaires de vos designs</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Design List */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-sm font-semibold text-surface-400 mb-3 uppercase tracking-wider">Designs</h3>
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {designs.length === 0 ? (
                <p className="text-sm text-surface-500 py-4 text-center">Aucun design</p>
              ) : (
                designs.map((design) => (
                  <button
                    key={design.id}
                    onClick={() => setSelectedDesignId(design.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                      selectedDesignId === design.id
                        ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                        : 'text-surface-400 hover:bg-surface-800 border border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 bg-surface-700 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {design.thumbnailUrl ? (
                        <img src={design.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Palette className="w-4 h-4 text-surface-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{design.title}</p>
                      {design._count && (
                        <p className="text-xs text-surface-500">{design._count.comments} commentaires</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="lg:col-span-3">
          {!selectedDesignId ? (
            <div className="card text-center py-16">
              <MessageSquare className="w-16 h-16 text-surface-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Sélectionnez un design</h3>
              <p className="text-surface-400">Choisissez un design pour voir ses commentaires</p>
            </div>
          ) : commentsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-surface-800 rounded-2xl h-24" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* New comment */}
              <div className="card">
                <div className="flex gap-3">
                  <div className="w-9 h-9 bg-brand-500/30 rounded-full flex items-center justify-center text-brand-400 font-medium text-sm flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="input-field h-20 resize-none"
                      placeholder="Ajouter un commentaire..."
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => newComment && createMutation.mutate(newComment)}
                        disabled={!newComment || createMutation.isPending}
                        className="btn-primary py-2 text-sm"
                      >
                        <Send className="w-4 h-4" /> Envoyer
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments list */}
              {comments && comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="card">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 bg-brand-500/20 rounded-full flex items-center justify-center text-brand-400 text-sm font-medium flex-shrink-0">
                        {comment.user?.displayName?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-surface-200">{comment.user?.displayName}</span>
                            <span className="text-xs text-surface-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(comment.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                              className="p-1.5 text-surface-500 hover:text-brand-400 rounded-lg hover:bg-surface-800"
                            >
                              <Reply className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(comment.id)}
                              className="p-1.5 text-surface-500 hover:text-red-400 rounded-lg hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-surface-300 mt-1">{comment.message}</p>

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-3">
                            <button
                              onClick={() => toggleThread(comment.id)}
                              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                            >
                              {expandedThreads.has(comment.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {comment.replies.length} réponse{comment.replies.length > 1 ? 's' : ''}
                            </button>
                            {expandedThreads.has(comment.id) && (
                              <div className="mt-2 ml-4 pl-4 border-l border-surface-700 space-y-3">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex gap-2">
                                    <div className="w-7 h-7 bg-surface-700 rounded-full flex items-center justify-center text-surface-300 text-xs font-medium flex-shrink-0">
                                      {reply.user?.displayName?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-surface-300">{reply.user?.displayName}</span>
                                        <span className="text-xs text-surface-500">
                                          {new Date(reply.createdAt).toLocaleDateString('fr-FR')}
                                        </span>
                                      </div>
                                      <p className="text-sm text-surface-400 mt-0.5">{reply.message}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Reply input */}
                        {replyTo === comment.id && (
                          <div className="flex gap-2 mt-3">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="input-field text-sm py-2"
                              placeholder="Écrire une réponse..."
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && replyText) {
                                  replyMutation.mutate({ id: comment.id, message: replyText });
                                }
                              }}
                            />
                            <button
                              onClick={() => replyText && replyMutation.mutate({ id: comment.id, message: replyText })}
                              disabled={!replyText || replyMutation.isPending}
                              className="p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl disabled:opacity-50"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="card text-center py-8">
                  <MessageSquare className="w-12 h-12 text-surface-600 mx-auto mb-3" />
                  <p className="text-surface-400">Aucun commentaire pour ce design</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
