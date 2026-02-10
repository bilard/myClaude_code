import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { settingsApi, authApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Settings as SettingsIcon, User, Key, Globe, Palette, Database,
  Shield, Link2, Save, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  ExternalLink, Mail, Lock, Eye, EyeOff, Store, Server, Upload,
  Download, Bell, Zap, Monitor
} from 'lucide-react';

type SettingsTab = 'profile' | 'canva' | 'magento' | 'app' | 'design' | 'export' | 'advanced';

const TABS: { id: SettingsTab; label: string; icon: typeof SettingsIcon }[] = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'canva', label: 'Canva API', icon: Palette },
  { id: 'magento', label: 'Magento', icon: Store },
  { id: 'app', label: 'Application', icon: Monitor },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'export', label: 'Export', icon: Download },
  { id: 'advanced', label: 'Avancé', icon: Server },
];

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Profile state
  const [profile, setProfile] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // App config state
  const [appConfig, setAppConfig] = useState<Record<string, Record<string, string>>>({});
  const [userSettings, setUserSettings] = useState<Record<string, Record<string, string>>>({});

  // Check URL params for Canva connection feedback
  useEffect(() => {
    const canvaStatus = searchParams.get('canva');
    const error = searchParams.get('error');
    if (canvaStatus === 'connected') {
      toast.success('Canva connecté avec succès !');
      refreshUser();
      setActiveTab('canva');
    }
    if (error === 'canva_auth_failed') toast.error('Échec de l\'authentification Canva');
    if (error === 'canva_auth_error') toast.error('Erreur lors de la connexion Canva');
    if (error === 'invalid_state') toast.error('Session expirée, veuillez réessayer');
  }, [searchParams, refreshUser]);

  const { data: appConfigData } = useQuery({
    queryKey: ['app-config'],
    queryFn: async () => {
      const { data } = await settingsApi.getAppConfig();
      return data;
    },
  });

  const { data: userSettingsData } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const { data } = await settingsApi.get();
      return data;
    },
  });

  useEffect(() => {
    if (appConfigData) setAppConfig(appConfigData);
  }, [appConfigData]);

  useEffect(() => {
    if (userSettingsData) setUserSettings(userSettingsData);
  }, [userSettingsData]);

  // Mutations
  const profileMutation = useMutation({
    mutationFn: (data: Record<string, string>) => authApi.updateMe(data),
    onSuccess: () => {
      refreshUser();
      toast.success('Profil mis à jour');
      setProfile(p => ({ ...p, currentPassword: '', newPassword: '', confirmPassword: '' }));
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'Erreur');
    },
  });

  const appConfigMutation = useMutation({
    mutationFn: (data: Record<string, Record<string, string>>) => settingsApi.updateAppConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-config'] });
      toast.success('Configuration sauvegardée');
    },
  });

  const userSettingsMutation = useMutation({
    mutationFn: (data: Record<string, Record<string, string>>) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast.success('Paramètres sauvegardés');
    },
  });

  const canvaConnectMutation = useMutation({
    mutationFn: () => authApi.getCanvaAuthUrl(),
    onSuccess: (res) => {
      if (res.data.authUrl) {
        window.location.href = res.data.authUrl;
      }
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'Erreur de connexion Canva');
    },
  });

  const canvaDisconnectMutation = useMutation({
    mutationFn: () => authApi.disconnectCanva(),
    onSuccess: () => {
      refreshUser();
      toast.success('Canva déconnecté');
    },
  });

  const handleProfileSave = () => {
    const data: Record<string, string> = {};
    if (profile.displayName !== user?.displayName) data.displayName = profile.displayName;
    if (profile.email !== user?.email) data.email = profile.email;
    if (profile.newPassword) {
      if (profile.newPassword !== profile.confirmPassword) {
        return toast.error('Les mots de passe ne correspondent pas');
      }
      data.currentPassword = profile.currentPassword;
      data.newPassword = profile.newPassword;
    }
    if (Object.keys(data).length === 0) return toast.error('Aucune modification');
    profileMutation.mutate(data);
  };

  const updateAppConfig = (group: string, key: string, value: string) => {
    setAppConfig(prev => ({
      ...prev,
      [group]: { ...prev[group], [key]: value },
    }));
  };

  const updateUserSetting = (group: string, key: string, value: string) => {
    setUserSettings(prev => ({
      ...prev,
      [group]: { ...prev[group], [key]: value },
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-brand-400" />
          Paramètres
        </h1>
        <p className="text-surface-400 mt-1">Configuration de l'application et de vos intégrations</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="card p-2 lg:sticky lg:top-20">
            <nav className="space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left text-sm ${
                      activeTab === tab.id
                        ? 'bg-brand-600/20 text-brand-400'
                        : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-brand-400" />
                Profil utilisateur
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Nom d'affichage</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-surface-700/50 pt-4">
                <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Changer le mot de passe
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-surface-400 mb-1.5">Mot de passe actuel</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={profile.currentPassword}
                      onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-surface-400 mb-1.5">Nouveau mot de passe</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={profile.newPassword}
                      onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-surface-400 mb-1.5">Confirmer</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={profile.confirmPassword}
                      onChange={(e) => setProfile({ ...profile, confirmPassword: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-surface-500 hover:text-surface-300 mt-2 flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showPassword ? 'Masquer' : 'Afficher'}
                </button>
              </div>

              <div className="flex justify-end">
                <button onClick={handleProfileSave} disabled={profileMutation.isPending} className="btn-primary">
                  <Save className="w-4 h-4" /> Sauvegarder le profil
                </button>
              </div>
            </div>
          )}

          {/* Canva Tab */}
          {activeTab === 'canva' && (
            <div className="space-y-4">
              <div className="card">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <Palette className="w-5 h-5 text-brand-400" />
                  Connexion Canva
                </h2>

                <div className={`p-4 rounded-xl border ${user?.canvaConnected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {user?.canvaConnected ? (
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                      )}
                      <div>
                        <p className="font-medium text-surface-200">
                          {user?.canvaConnected ? 'Canva est connecté' : 'Canva n\'est pas connecté'}
                        </p>
                        <p className="text-sm text-surface-400 mt-0.5">
                          {user?.canvaConnected
                            ? `ID utilisateur Canva: ${user?.canvaUserId || 'N/A'}`
                            : 'Connectez votre compte Canva pour accéder à toutes les fonctionnalités'}
                        </p>
                      </div>
                    </div>
                    {user?.canvaConnected ? (
                      <button
                        onClick={() => canvaDisconnectMutation.mutate()}
                        disabled={canvaDisconnectMutation.isPending}
                        className="btn-danger"
                      >
                        <XCircle className="w-4 h-4" /> Déconnecter
                      </button>
                    ) : (
                      <button
                        onClick={() => canvaConnectMutation.mutate()}
                        disabled={canvaConnectMutation.isPending}
                        className="btn-primary"
                      >
                        {canvaConnectMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Link2 className="w-4 h-4" />
                        )}
                        Connecter Canva
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-4">Configuration API Canva</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1.5">Client ID</label>
                    <input
                      type="text"
                      value={appConfig.canva?.canva_client_id || ''}
                      onChange={(e) => updateAppConfig('canva', 'canva_client_id', e.target.value)}
                      className="input-field font-mono text-sm"
                      placeholder="Votre Canva Client ID"
                    />
                    <p className="text-xs text-surface-500 mt-1">
                      Disponible sur le <a href="https://www.canva.com/developers/" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">Canva Developer Portal</a>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1.5">Client Secret</label>
                    <input
                      type="password"
                      value={appConfig.canva?.canva_client_secret || ''}
                      onChange={(e) => updateAppConfig('canva', 'canva_client_secret', e.target.value)}
                      className="input-field font-mono text-sm"
                      placeholder="Votre Canva Client Secret"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1.5">URL de redirection OAuth</label>
                    <input
                      type="text"
                      value={appConfig.canva?.canva_redirect_uri || 'http://127.0.0.1:3001/api/auth/canva/callback'}
                      onChange={(e) => updateAppConfig('canva', 'canva_redirect_uri', e.target.value)}
                      className="input-field font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1.5">URL de base API</label>
                    <input
                      type="text"
                      value={appConfig.canva?.canva_api_base || 'https://api.canva.com/rest'}
                      onChange={(e) => updateAppConfig('canva', 'canva_api_base', e.target.value)}
                      className="input-field font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => appConfigMutation.mutate(appConfig)}
                    disabled={appConfigMutation.isPending}
                    className="btn-primary"
                  >
                    <Save className="w-4 h-4" /> Sauvegarder
                  </button>
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3">Permissions (Scopes)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { scope: 'asset:read', label: 'Lire les assets' },
                    { scope: 'asset:write', label: 'Écrire les assets' },
                    { scope: 'design:content:read', label: 'Lire les designs' },
                    { scope: 'design:content:write', label: 'Écrire les designs' },
                    { scope: 'design:meta:read', label: 'Métadonnées designs' },
                    { scope: 'brandtemplate:meta:read', label: 'Templates brand' },
                    { scope: 'comment:read', label: 'Lire commentaires' },
                    { scope: 'comment:write', label: 'Écrire commentaires' },
                    { scope: 'folder:read', label: 'Lire dossiers' },
                    { scope: 'folder:write', label: 'Écrire dossiers' },
                    { scope: 'profile:read', label: 'Lire profil' },
                  ].map((perm) => (
                    <div key={perm.scope} className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-800/50">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-surface-300">{perm.label}</p>
                        <p className="text-xs text-surface-500 font-mono">{perm.scope}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Magento Tab */}
          {activeTab === 'magento' && (
            <div className="card space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-brand-400" />
                Intégration Magento
              </h2>

              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-300 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Connectez votre boutique Magento pour synchroniser les templates avec votre catalogue produits.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">URL de base Magento</label>
                  <input
                    type="url"
                    value={appConfig.magento?.magento_base_url || ''}
                    onChange={(e) => updateAppConfig('magento', 'magento_base_url', e.target.value)}
                    className="input-field"
                    placeholder="https://votre-boutique.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Token API Magento</label>
                  <input
                    type="password"
                    value={appConfig.magento?.magento_api_token || ''}
                    onChange={(e) => updateAppConfig('magento', 'magento_api_token', e.target.value)}
                    className="input-field font-mono text-sm"
                    placeholder="Votre token d'intégration Magento"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Version API</label>
                  <select
                    value={appConfig.magento?.magento_api_version || 'V1'}
                    onChange={(e) => updateAppConfig('magento', 'magento_api_version', e.target.value)}
                    className="input-field"
                  >
                    <option value="V1">REST API V1</option>
                    <option value="V2">REST API V2 (async)</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appConfig.magento?.magento_enabled === 'true'}
                      onChange={(e) => updateAppConfig('magento', 'magento_enabled', e.target.checked ? 'true' : 'false')}
                      className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm text-surface-300">Activer l'intégration Magento</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Webhook URL (pour Magento)</label>
                  <div className="input-field bg-surface-900 text-surface-400 font-mono text-sm flex items-center">
                    {`${window.location.origin}/api/webhooks/magento`}
                  </div>
                  <p className="text-xs text-surface-500 mt-1">Configurez cette URL comme webhook dans votre admin Magento</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Sync automatique des produits</label>
                  <select
                    value={appConfig.magento?.magento_sync_interval || 'manual'}
                    onChange={(e) => updateAppConfig('magento', 'magento_sync_interval', e.target.value)}
                    className="input-field"
                  >
                    <option value="manual">Manuel</option>
                    <option value="hourly">Toutes les heures</option>
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => appConfigMutation.mutate(appConfig)}
                  disabled={appConfigMutation.isPending}
                  className="btn-primary"
                >
                  <Save className="w-4 h-4" /> Sauvegarder
                </button>
              </div>
            </div>
          )}

          {/* App Tab */}
          {activeTab === 'app' && (
            <div className="card space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Monitor className="w-5 h-5 text-brand-400" />
                Configuration de l'application
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Nom de l'application</label>
                  <input
                    type="text"
                    value={appConfig.general?.app_name || 'Canva Studio Pro'}
                    onChange={(e) => updateAppConfig('general', 'app_name', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Langue</label>
                  <select
                    value={appConfig.general?.app_locale || 'fr'}
                    onChange={(e) => updateAppConfig('general', 'app_locale', e.target.value)}
                    className="input-field"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Thème</label>
                  <select
                    value={userSettings.display?.theme || 'dark'}
                    onChange={(e) => updateUserSetting('display', 'theme', e.target.value)}
                    className="input-field"
                  >
                    <option value="dark">Sombre</option>
                    <option value="light">Clair (bientôt)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Notifications</label>
                  <div className="space-y-2">
                    {[
                      { key: 'notify_export', label: 'Export terminé' },
                      { key: 'notify_comment', label: 'Nouveau commentaire' },
                      { key: 'notify_sync', label: 'Synchronisation terminée' },
                    ].map((notif) => (
                      <label key={notif.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userSettings.notifications?.[notif.key] !== 'false'}
                          onChange={(e) => updateUserSetting('notifications', notif.key, e.target.checked ? 'true' : 'false')}
                          className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500"
                        />
                        <span className="text-sm text-surface-300">{notif.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => userSettingsMutation.mutate(userSettings)}
                  disabled={userSettingsMutation.isPending}
                  className="btn-secondary"
                >
                  <Save className="w-4 h-4" /> Paramètres utilisateur
                </button>
                <button
                  onClick={() => appConfigMutation.mutate(appConfig)}
                  disabled={appConfigMutation.isPending}
                  className="btn-primary"
                >
                  <Save className="w-4 h-4" /> Config application
                </button>
              </div>
            </div>
          )}

          {/* Design Tab */}
          {activeTab === 'design' && (
            <div className="card space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-brand-400" />
                Paramètres de design
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Largeur par défaut (px)</label>
                  <input
                    type="number"
                    value={appConfig.design?.default_design_width || '1920'}
                    onChange={(e) => updateAppConfig('design', 'default_design_width', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Hauteur par défaut (px)</label>
                  <input
                    type="number"
                    value={appConfig.design?.default_design_height || '1080'}
                    onChange={(e) => updateAppConfig('design', 'default_design_height', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Qualité d'export par défaut</label>
                <select
                  value={appConfig.design?.default_export_quality || 'high'}
                  onChange={(e) => updateAppConfig('design', 'default_export_quality', e.target.value)}
                  className="input-field"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Suppression auto des brouillons (jours)</label>
                <input
                  type="number"
                  value={appConfig.design?.auto_delete_drafts_days || '30'}
                  onChange={(e) => updateAppConfig('design', 'auto_delete_drafts_days', e.target.value)}
                  className="input-field"
                  min={0}
                />
                <p className="text-xs text-surface-500 mt-1">0 = pas de suppression automatique</p>
              </div>
              <div className="flex justify-end">
                <button onClick={() => appConfigMutation.mutate(appConfig)} disabled={appConfigMutation.isPending} className="btn-primary">
                  <Save className="w-4 h-4" /> Sauvegarder
                </button>
              </div>
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="card space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-brand-400" />
                Paramètres d'export
              </h2>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Formats d'export activés</label>
                <div className="grid grid-cols-3 gap-2">
                  {['pdf', 'jpg', 'png', 'gif', 'pptx', 'mp4'].map((fmt) => (
                    <label key={fmt} className="flex items-center gap-2 p-3 rounded-xl bg-surface-800/50 cursor-pointer hover:bg-surface-800">
                      <input
                        type="checkbox"
                        checked={(appConfig.export?.export_formats || 'pdf,jpg,png,gif,pptx,mp4').includes(fmt)}
                        onChange={(e) => {
                          const current = (appConfig.export?.export_formats || 'pdf,jpg,png,gif,pptx,mp4').split(',');
                          const updated = e.target.checked
                            ? [...current, fmt]
                            : current.filter(f => f !== fmt);
                          updateAppConfig('export', 'export_formats', updated.join(','));
                        }}
                        className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500"
                      />
                      <span className="text-sm font-medium text-surface-300">{fmt.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Durée de validité des liens (heures)</label>
                <input
                  type="number"
                  value={appConfig.export?.export_link_validity_hours || '24'}
                  onChange={(e) => updateAppConfig('export', 'export_link_validity_hours', e.target.value)}
                  className="input-field"
                  min={1}
                />
              </div>
              <div className="flex justify-end">
                <button onClick={() => appConfigMutation.mutate(appConfig)} disabled={appConfigMutation.isPending} className="btn-primary">
                  <Save className="w-4 h-4" /> Sauvegarder
                </button>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div className="card space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-brand-400" />
                  Configuration avancée
                </h2>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Taille max d'upload (MB)</label>
                  <input
                    type="number"
                    value={appConfig.upload?.max_upload_size_mb || '100'}
                    onChange={(e) => updateAppConfig('upload', 'max_upload_size_mb', e.target.value)}
                    className="input-field"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Types de fichiers acceptés</label>
                  <input
                    type="text"
                    value={appConfig.upload?.allowed_file_types || 'image/png,image/jpeg,image/svg+xml,image/webp,video/mp4'}
                    onChange={(e) => updateAppConfig('upload', 'allowed_file_types', e.target.value)}
                    className="input-field font-mono text-sm"
                  />
                  <p className="text-xs text-surface-500 mt-1">MIME types séparés par des virgules</p>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => appConfigMutation.mutate(appConfig)} disabled={appConfigMutation.isPending} className="btn-primary">
                    <Save className="w-4 h-4" /> Sauvegarder
                  </button>
                </div>
              </div>

              <div className="card space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-brand-400" />
                  Base de données
                </h2>
                <div className="p-4 rounded-xl bg-surface-800/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-surface-500">Type</p>
                      <p className="text-surface-200 font-medium">SQLite</p>
                    </div>
                    <div>
                      <p className="text-surface-500">Fichier</p>
                      <p className="text-surface-200 font-mono text-xs">prisma/dev.db</p>
                    </div>
                    <div>
                      <p className="text-surface-500">ORM</p>
                      <p className="text-surface-200 font-medium">Prisma</p>
                    </div>
                    <div>
                      <p className="text-surface-500">Status</p>
                      <p className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Connecté
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-brand-400" />
                  Sécurité
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-800/50">
                    <span className="text-surface-400">Authentification JWT</span>
                    <span className="badge-success">Activé</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-800/50">
                    <span className="text-surface-400">Rate Limiting</span>
                    <span className="badge-success">500 req/15min</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-800/50">
                    <span className="text-surface-400">CORS</span>
                    <span className="badge-success">Configuré</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-800/50">
                    <span className="text-surface-400">OAuth 2.0 PKCE</span>
                    <span className="badge-success">Activé</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
