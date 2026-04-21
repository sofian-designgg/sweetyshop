# 🤖 Ohio Bot

Bot Discord pour la gestion de tickets et système d'échange.

## 📋 Commandes

### Tickets
- `/ticket configurer` - Configurer le système
- `/ticket ajouter` - Ajouter une catégorie
- `/ticket envoyer` - Envoyer le panel
- `/ticket liste` - Voir les catégories

### Exchanger
- `/exchanger configurer` - Configurer le salon
- `/exchanger ajouter` - Ajouter une paire
- `/exchanger envoyer` - Envoyer le panel

### Utilitaires
- `/embed` - Créer un embed personnalisé

## 🚀 Installation

1. Copier `.env.example` vers `.env` et remplir les valeurs
2. `npm install`
3. `npm run deploy` (une seule fois)
4. `npm start`

## 🔧 Déploiement Railway

Variables d'environnement:
- `DISCORD_TOKEN`
- `CLIENT_ID`
- `MONGODB_URI`
