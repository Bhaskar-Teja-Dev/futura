/**
 * Seeds two default Digital Rebel demo cards into localStorage once per browser.
 * Merges with any cards already saved (e.g. user added a card before visiting Cards / Checkout).
 * Used by checkout saved-cards, cards management, and add-card flows.
 */
(function (global) {
  'use strict';

  function defaultDemoCards() {
    return [
      {
        id: 1000000000001,
        name: 'REBEL_OPERATIVE_01',
        lastFour: '8829',
        expiry: '12/28',
        balance: 0,
        frozen: false,
        icon: 'contactless',
        title: 'TITANIUM_ELITE',
        number: '4000000000008829'
      },
      {
        id: 1000000000002,
        name: 'REBEL_VAULT_77',
        lastFour: '4401',
        expiry: '05/26',
        balance: 0,
        frozen: true,
        icon: 'ac_unit',
        title: 'COLD_STORAGE',
        number: '5400000000004401'
      }
    ];
  }

  function ensureRebelCardsSeeded() {
    if (localStorage.getItem('rebel_cards_init') === 'true') return;

    var existing = [];
    try {
      existing = JSON.parse(localStorage.getItem('rebel_cards') || '[]');
    } catch (e) {
      existing = [];
    }

    var seen = {};
    existing.forEach(function (c) {
      if (c && c.lastFour) seen[String(c.lastFour)] = true;
    });

    var toPrepend = defaultDemoCards().filter(function (d) {
      return !seen[d.lastFour];
    });

    var merged = toPrepend.concat(existing);
    localStorage.setItem('rebel_cards', JSON.stringify(merged));
    localStorage.setItem('rebel_cards_init', 'true');
  }

  global.ensureRebelCardsSeeded = ensureRebelCardsSeeded;
})(typeof window !== 'undefined' ? window : globalThis);
