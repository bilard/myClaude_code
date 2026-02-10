# Canva Studio Pro

Plateforme complète de création et gestion de templates intégrée avec l'API Canva Connect, conçue pour les boutiques Magento.

## Stack technique

- **Frontend** : React 19 + TypeScript + Vite + Tailwind CSS
- **Backend** : Express + TypeScript
- **Base de données** : SQLite + Prisma ORM
- **API** : Canva Connect API (46+ endpoints)
- **Auth** : JWT + OAuth 2.0 PKCE (Canva)

## Installation

```bash
npm run setup
```

## Lancement

```bash
npm run dev
```

- Frontend : http://127.0.0.1:5173
- API : http://127.0.0.1:3001

## Compte démo

- Email : `admin@canvastudio.local`
- Mot de passe : `admin123`

## Configuration Canva

1. Créez une intégration sur [Canva Developer Portal](https://www.canva.com/developers/)
2. Configurez le Client ID et Secret dans `.env`
3. Ajoutez `http://127.0.0.1:3001/api/auth/canva/callback` comme redirect URI
4. Connectez votre compte Canva dans Paramètres > Canva API

## Fonctionnalités

- Tableau de bord avec statistiques
- Gestion des designs (CRUD, synchronisation Canva, aperçu)
- Gestion des templates (brand templates, autofill)
- Médiathèque (upload fichiers, dossiers, import URL)
- Système d'export multi-format (PDF, PNG, JPG, GIF, PPTX, MP4)
- Commentaires avec threads
- Paramètres complets (Profil, Canva API, Magento, Application, Design, Export, Avancé)
- Intégration Magento configurable
