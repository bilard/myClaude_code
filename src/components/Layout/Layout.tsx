import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Palette, LayoutTemplate, Image, Download,
  MessageSquare, Settings, LogOut, Menu, X, ChevronRight,
  Sparkles, FolderOpen
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/designs', label: 'Mes Designs', icon: Palette },
  { path: '/templates', label: 'Templates', icon: LayoutTemplate },
  { path: '/assets', label: 'Médiathèque', icon: Image },
  { path: '/exports', label: 'Exports', icon: Download },
  { path: '/comments', label: 'Commentaires', icon: MessageSquare },
];

const bottomItems = [
  { path: '/settings', label: 'Paramètres', icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {sidebarOpen && (
          <div className="animate-fade-in">
            <h1 className="text-lg font-bold text-white leading-tight">Canva Studio</h1>
            <p className="text-xs text-surface-400">Pro Edition</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                ${active
                  ? 'bg-brand-600/20 text-brand-400 shadow-sm'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
                }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-500 rounded-r-full" />
              )}
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-brand-400' : 'group-hover:text-surface-300'}`} />
              {sidebarOpen && (
                <span className="text-sm font-medium animate-fade-in">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-surface-700/50 space-y-1.5">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                ${active
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
                }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}

        {/* User profile */}
        <div className="flex items-center gap-3 px-3 py-3 mt-3 rounded-xl bg-surface-800/40 border border-surface-700/30">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {user?.displayName?.charAt(0).toUpperCase()}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-medium text-surface-200 truncate">{user?.displayName}</p>
              <p className="text-xs text-surface-500 truncate">{user?.email}</p>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={logout}
              className="p-1.5 text-surface-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-surface-800/50 bg-surface-900/80 backdrop-blur-xl transition-all duration-300 fixed top-0 left-0 h-screen z-30
          ${sidebarOpen ? 'w-64' : 'w-[72px]'}`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-screen w-72 bg-surface-900 border-r border-surface-800 z-50 transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-[72px]'}`}>
        {/* Top Bar */}
        <header className="h-16 border-b border-surface-800/50 bg-surface-900/40 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-surface-400 hover:text-surface-200 rounded-lg hover:bg-surface-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-2 text-surface-400 hover:text-surface-200 rounded-lg hover:bg-surface-800 transition-all"
            >
              <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <FolderOpen className="w-4 h-4 text-surface-500" />
              <span className="text-surface-400">
                {navItems.find(i => isActive(i.path))?.label || bottomItems.find(i => isActive(i.path))?.label || 'Page'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.canvaConnected ? (
              <span className="badge-success text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse-soft" />
                Canva connecté
              </span>
            ) : (
              <Link to="/settings" className="badge-warning text-xs flex items-center gap-1.5">
                Connecter Canva
              </Link>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
