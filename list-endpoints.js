// list-endpoints.js
const app = require('./src/app');
const listEndpoints = require('express-list-endpoints');

console.log('\n📋 TOUS LES ENDPOINTS DE L\'API:\n');
console.log('═══════════════════════════════════════════════════\n');

const endpoints = listEndpoints(app);

// Regrouper par chemin
const grouped = {};
endpoints.forEach(endpoint => {
    const basePath = endpoint.path.split('/')[2] || 'root';
    if (!grouped[basePath]) grouped[basePath] = [];
    grouped[basePath].push(endpoint);
});

// Afficher de façon organisée
Object.keys(grouped).sort().forEach(base => {
    console.log(`\n🔹 /api/${base}`);
    console.log('─'.repeat(50));
    
    grouped[base].forEach(e => {
        const methods = e.methods.join(', ');
        console.log(`   ${methods.padEnd(20)} ${e.path}`);
    });
});

console.log('\n═══════════════════════════════════════════════════\n');
