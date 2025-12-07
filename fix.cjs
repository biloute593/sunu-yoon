const fs = require('fs');

// Lire le fichier
let text = fs.readFileSync('App.tsx', 'utf8');

// Remplacements avec regex large
text = text.replace(/Ou saisir manuellement.+?500.{0,2}F\)/, 'Saisir votre tarif');
text = text.replace(/Ajustez librement.+?500.{0,2}F\./g, '💡 Tapez librement le tarif de votre choix.');

// Écrire
fs.writeFileSync('App.tsx', text, 'utf8');

console.log('✅ Modifications terminées!');
