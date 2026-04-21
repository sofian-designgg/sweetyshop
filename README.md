# Ohio Bot - Discord Tickets & Exchanger

Bot Discord moderne avec système de tickets et exchanger.

## 📁 Structure

```
src/
├── index.js           # Point d'entrée
├── database.js        # MongoDB + Modèles
├── commands/          # Slash commands
│   ├── ticket.js
│   └── config.js
├── events/            # Event handlers
│   └── interactionCreate.js
├── services/          # Logique métier
│   └── ticketService.js
└── utils/             # Utilitaires
    ├── embeds.js
    └── permissions.js
```

## 🚀 Installation

### 1. Environnement

```bash
npm install
```

### 2. Variables d'environnement

Créer `.env`:

```env
DISCORD_TOKEN=ton_token_ici
MONGO_URL=url_mongodb
```

### 3. Lancer

```bash
npm start
```

## 📋 Configuration

### Étape 1: Configurer la catégorie des tickets

```
/ticket configurer categorie:#Catégorie salon:#salon-panel
```

### Étape 2: Ajouter des catégories de tickets

```
/ticket bouton-ajouter
  id: support
  label: Support
  prompt: Décris ton problème
  emoji: 🎫
  style: Secondary
```

### Étape 3: Personnaliser l'embed

```
/config panel-embed
  titre: 🎫 Support
  description: Bienvenue! Ouvre un ticket ci-dessous.
  couleur: 5793266
```

### Étape 4: Envoyer le panel

```
/ticket panel-envoyer
```

## 🎫 Commandes disponibles

| Commande | Description |
|----------|-------------|
| `/ticket panel-envoyer` | Envoie/met à jour le panel |
| `/ticket bouton-ajouter` | Ajoute une catégorie |
| `/ticket bouton-supprimer` | Supprime une catégorie |
| `/ticket liste` | Liste les catégories |
| `/ticket configurer` | Configure salon/catégorie |
| `/config voir` | Voir la config |
| `/config panel-embed` | Configurer l'embed |

## 🛠️ Tech Stack

- **discord.js** ^14.18.0
- **mongoose** ^8.0.0
- **Node.js** 18+

## 📄 Licence

MIT
