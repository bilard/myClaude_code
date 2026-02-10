import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './components/Layout/Login';
import Dashboard from './components/Dashboard/Dashboard';
import DesignList from './components/Designs/DesignList';
import DesignDetail from './components/Designs/DesignDetail';
import TemplateList from './components/Templates/TemplateList';
import TemplateDetail from './components/Templates/TemplateDetail';
import AssetManager from './components/Assets/AssetManager';
import ExportList from './components/Exports/ExportList';
import CommentView from './components/Comments/CommentView';
import Settings from './components/Settings/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-surface-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/designs" element={<DesignList />} />
                <Route path="/designs/:id" element={<DesignDetail />} />
                <Route path="/templates" element={<TemplateList />} />
                <Route path="/templates/:id" element={<TemplateDetail />} />
                <Route path="/assets" element={<AssetManager />} />
                <Route path="/exports" element={<ExportList />} />
                <Route path="/comments" element={<CommentView />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
