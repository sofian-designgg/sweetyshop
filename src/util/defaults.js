/** Catégories ticket par défaut (shop Nitro / paiements) */
function defaultTicketCategories() {
  return [
    {
      id: 'question',
      label: 'Questions',
      emoji: '💬',
      row: 0,
      style: 'Secondary',
      prompt: 'Une question rapide sur nos produits ?',
      hint: 'Appuie sur Questions pour ouvrir le ticket.',
    },
    {
      id: 'general',
      label: 'Support général',
      emoji: '🛒',
      row: 0,
      style: 'Secondary',
      prompt: 'Besoin d’aide sur la boutique ?',
      hint: 'Appuie sur Support général.',
    },
    {
      id: 'nitro',
      label: 'Nitro',
      emoji: '💎',
      row: 1,
      style: 'Primary',
      prompt: 'Commande ou problème lié au Nitro ?',
      hint: 'Ouvre un ticket Nitro.',
    },
    {
      id: 'paypal',
      label: 'Paiement PayPal',
      emoji: '💳',
      row: 1,
      style: 'Secondary',
      prompt: 'Paiement ou preuve PayPal ?',
      hint: 'Ticket dédié PayPal.',
    },
    {
      id: 'crypto',
      label: 'Crypto (LTC/ETH/SOL)',
      emoji: '🪙',
      row: 2,
      style: 'Secondary',
      prompt: 'Paiement crypto ou TXID ?',
      hint: 'Indique la devise dans le ticket.',
    },
    {
      id: 'remplacement',
      label: 'Remplacement',
      emoji: '🛡️',
      row: 2,
      style: 'Danger',
      prompt: 'Produit défectueux ou non reçu ?',
      hint: 'Demande de remplacement.',
    },
  ];
}

function defaultPaymentEmbeds() {
  return {
    paypal: {
      title: 'Paiement PayPal',
      description:
        'Envoie le paiement **en amis et proches** si possible.\nAprès paiement, envoie une **capture** dans ton ticket.',
      color: 0x5865f2,
      fields: [
        { name: 'Email / lien', value: '`À configurer avec +paiement set`', inline: false },
        { name: 'Montant', value: '`À configurer`', inline: true },
        { name: 'Note', value: 'Mentionne ton **pseudo Discord** en note.', inline: false },
      ],
      footer: 'SweetyShop',
    },
    litecoin: {
      title: 'Litecoin (LTC)',
      description: 'Envoie le montant exact à l’adresse ci-dessous puis poste le **TXID** dans ton ticket.',
      color: 0x345c9c,
      fields: [
        { name: 'Adresse LTC', value: '`À configurer`', inline: false },
        { name: 'Montant', value: '`À configurer`', inline: true },
      ],
      footer: 'Vérifie le réseau : Litecoin',
    },
    ethereum: {
      title: 'Ethereum (ETH)',
      description: 'ERC-20 / réseau à préciser. Envoie le **TXID** après transaction.',
      color: 0x627eea,
      fields: [
        { name: 'Adresse ETH', value: '`À configurer`', inline: false },
        { name: 'Montant', value: '`À configurer`', inline: true },
      ],
      footer: 'Frais de gas à ta charge',
    },
    solana: {
      title: 'Solana (SOL)',
      description: 'Envoie au wallet indiqué. **TXID** ou signature dans le ticket.',
      color: 0x9945ff,
      fields: [
        { name: 'Adresse SOL', value: '`À configurer`', inline: false },
        { name: 'Montant', value: '`À configurer`', inline: true },
      ],
      footer: 'Réseau Solana uniquement',
    },
  };
}

module.exports = { defaultTicketCategories, defaultPaymentEmbeds };
