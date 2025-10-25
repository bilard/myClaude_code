# To Do List - Application Moderne et Responsive

Une application de gestion de tâches moderne et responsive avec stockage Supabase.

## Fonctionnalités

- ✅ Ajouter, modifier et supprimer des tâches
- ✅ Marquer les tâches comme terminées
- ✅ Filtrer par statut (Toutes, Actives, Terminées)
- ✅ Compteurs en temps réel
- ✅ Stockage dans Supabase avec fallback sur localStorage
- ✅ Design moderne avec animations
- ✅ Interface 100% responsive (mobile, tablette, desktop)
- ✅ Sauvegarde automatique

## Technologies Utilisées

- HTML5
- CSS3 (Variables CSS, Flexbox, Animations)
- JavaScript (ES6+, Async/Await)
- Supabase (Base de données en temps réel)
- Font Awesome (Icônes)

## Installation et Configuration

### 1. Cloner le projet

```bash
git clone <votre-repo>
cd myClaude_code
```

### 2. Configuration Supabase (Optionnel)

Si vous souhaitez utiliser Supabase pour la persistance des données :

#### a. Créer un compte Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un compte gratuit
3. Créez un nouveau projet

#### b. Créer la table `tasks`

Dans l'éditeur SQL de Supabase, exécutez :

```sql
-- Créer la table tasks
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations (pour le développement)
-- ⚠️ En production, configurez des politiques plus restrictives
CREATE POLICY "Enable all operations for anonymous users" ON tasks
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Index pour améliorer les performances
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_completed ON tasks(completed);
```

#### c. Configurer les credentials

1. Copiez le fichier de configuration :
```bash
cp config.js.example config.js
```

2. Ouvrez `config.js` et remplissez avec vos credentials Supabase :
   - Trouvez votre `URL` dans : Settings > API > Project URL
   - Trouvez votre `anon key` dans : Settings > API > Project API keys

```javascript
const SUPABASE_URL = 'https://votre-projet.supabase.co';
const SUPABASE_ANON_KEY = 'votre-anon-key';
```

### 3. Utilisation sans Supabase

L'application fonctionne parfaitement sans Supabase ! Si vous ne configurez pas Supabase, elle utilisera automatiquement le `localStorage` de votre navigateur.

### 4. Ouvrir l'application

Ouvrez simplement le fichier `index.html` dans votre navigateur :

```bash
open index.html
# ou double-cliquez sur le fichier
```

## Structure du Projet

```
myClaude_code/
│
├── index.html          # Structure HTML
├── styles.css          # Styles CSS avec design responsive
├── script.js           # Logique JavaScript avec Supabase
├── config.js.example   # Template de configuration Supabase
├── config.js          # Configuration Supabase (ignoré par git)
├── .gitignore         # Fichiers à ignorer par git
└── README.md          # Documentation
```

## Utilisation

1. **Ajouter une tâche** : Tapez votre tâche dans le champ de saisie et cliquez sur "Ajouter" (ou appuyez sur Entrée)
2. **Marquer comme terminée** : Cliquez sur la checkbox à gauche de la tâche
3. **Supprimer une tâche** : Cliquez sur le bouton rouge de suppression
4. **Filtrer les tâches** : Utilisez les boutons de filtre (Toutes, Actives, Terminées)
5. **Supprimer toutes les tâches terminées** : Cliquez sur le bouton en bas

## Sécurité

- ⚠️ Le fichier `config.js` contient des clés sensibles et est ignoré par git
- ⚠️ Ne commitez jamais votre `config.js` dans un dépôt public
- ⚠️ Pour la production, configurez des politiques RLS (Row Level Security) plus restrictives dans Supabase

## Responsive Design

L'application s'adapte automatiquement à toutes les tailles d'écran :
- **Desktop** (> 640px) : Interface complète avec tous les détails
- **Tablette** (400px - 640px) : Interface optimisée
- **Mobile** (< 400px) : Interface compacte avec navigation simplifiée

## Personnalisation

Les couleurs et styles sont définis dans `styles.css` via des variables CSS :

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --success-color: #10b981;
    --danger-color: #ef4444;
    /* ... */
}
```

## Support

Pour toute question ou problème, ouvrez une issue sur GitHub.

## Licence

MIT License - Libre d'utilisation

---

🤖 Créé avec [Claude Code](https://claude.com/claude-code)
