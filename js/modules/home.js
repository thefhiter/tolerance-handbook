/* Start page: overview of every section, grouped like the sidebar. */
(function (TH) {
  'use strict';
  var h = TH.h;
  var BLURB = {
    'fits': { en: 'Hole/shaft limits, clearance or interference, zone diagram', fr: 'Écarts alésage/arbre, jeu ou serrage, schéma des zones' },
    'limits': { en: 'Deviation tables for any tolerance position', fr: 'Tableaux d’écarts pour toute position de tolérance' },
    'it-grades': { en: 'IT01 to IT18 up to 3150 mm', fr: 'IT01 à IT18 jusqu’à 3150 mm' },
    'preferred-fits': { en: 'ISO selection from H11/c11 to H7/u6', fr: 'Sélection ISO de H11/c11 à H7/u6' }
  };
  TH.register({
    id: 'home', group: 'start', order: 0,
    title: { en: 'Overview', fr: 'Sommaire' },
    keywords: 'home overview start accueil sommaire',
    render: function (root) {
      root.appendChild(TH.pageHead({
        title: { en: 'Tolerance Handbook', fr: 'Manuel des tolérances' },
        std: ['ISO 286', 'ISO 2768', 'ISO 1101', 'ISO 965', 'ISO 8062', 'ISO 13920'],
        lede: {
          en: 'A quick reference for machinists and mechanical designers: fits and limits, general and geometric tolerances, threads, machine elements and workshop data. Works offline. Values update as you type; decimal comma or point are both accepted.',
          fr: 'Un aide-mémoire pour l’atelier et le bureau d’études : ajustements, tolérances générales et géométriques, filetages, éléments de machines et données d’atelier. Fonctionne hors ligne. Les résultats se mettent à jour pendant la saisie ; la virgule et le point décimal sont acceptés.'
        }
      }));
      TH.groups.forEach(function (g) {
        if (g.id === 'start') return;
        var mods = TH.modules.filter(function (m) { return m.group === g.id; })
          .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        if (!mods.length) return;
        root.appendChild(h('section', { class: 'home-group' },
          h('h2', { text: TH.t(g.title) }),
          h('div', { class: 'tiles' }, mods.map(function (m) {
            return h('a', { class: 'tile', href: '#/' + m.id },
              h('strong', { text: TH.t(m.short || m.title) }),
              h('span', { text: TH.t(BLURB[m.id] || m.title) }));
          }))));
      });
      root.appendChild(TH.note({
        en: 'Tip: press / to search the sections. Values come from the cited ISO standards; always check the current edition and your drawing requirements for contractual use.',
        fr: 'Astuce : appuyer sur / pour rechercher une rubrique. Les valeurs proviennent des normes ISO citées ; vérifier l’édition en vigueur et les exigences du plan pour un usage contractuel.'
      }));
    }
  });
})(window.TH);
