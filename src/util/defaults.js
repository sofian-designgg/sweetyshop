/** Catégories ticket par défaut (Vierge par défaut maintenant) */
function defaultTicketCategories() {
  return [];
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
