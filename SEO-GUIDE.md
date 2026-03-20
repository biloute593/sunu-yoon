# 🔍 Guide SEO & Indexation - Sunu Yoon

## ✅ Ce qui est déjà fait (automatique)

### Fichiers SEO déployés
| Fichier | URL | Status |
|---------|-----|--------|
| sitemap.xml | https://sunuyoon.net/sitemap.xml | ✅ Live |
| robots.txt | https://sunuyoon.net/robots.txt | ✅ Live |
| llms.txt | https://sunuyoon.net/llms.txt | ✅ Live |
| ai-plugin.json | https://sunuyoon.net/.well-known/ai-plugin.json | ✅ Live |
| openapi.json | https://sunuyoon.net/.well-known/openapi.json | ✅ Live |
| IndexNow key | https://sunuyoon.net/77bbda755438418b876e6f4998d5a8cc.txt | ✅ Live |

### Meta tags (dans index.html)
- ✅ 30+ mots-clés (FR + EN + Wolof)
- ✅ Open Graph (Facebook, WhatsApp)
- ✅ Twitter Cards
- ✅ URL canonique
- ✅ Hreflang (fr, x-default)
- ✅ Geo tags (Sénégal, Dakar)
- ✅ 5 blocs JSON-LD (WebApplication, Organization, FAQPage, BreadcrumbList, ItemList)
- ✅ Lien vers ai-plugin.json pour ChatGPT

### Soumissions automatiques
- ✅ IndexNow → Bing (429 = accepté, en file d'attente)
- ✅ IndexNow → Yandex (202 = accepté)

---

## 📋 Actions manuelles requises (5 min)

### 1. Google Search Console
1. Aller sur https://search.google.com/search-console
2. Cliquer **"Ajouter une propriété"**
3. Choisir **"Préfixe d'URL"** → entrer `https://sunuyoon.net`
4. Méthode de vérification : choisir **"Balise HTML"** ou **"Fournisseur de nom de domaine"**
   - Si balise HTML : copier la balise meta et me la donner, je l'ajouterai
   - Si DNS : ajouter le TXT record chez votre registrar
5. Une fois vérifié :
   - Aller dans **Sitemaps** → soumettre `https://sunuyoon.net/sitemap.xml`
   - Aller dans **Inspection d'URL** → tester la page d'accueil
   - Demander l'indexation de chaque page

### 2. Bing Webmaster Tools
1. Aller sur https://www.bing.com/webmasters
2. Se connecter avec un compte Microsoft
3. Ajouter le site `https://sunuyoon.net`
4. Vérifier via IndexNow (déjà soumis) ou DNS
5. Soumettre le sitemap : `https://sunuyoon.net/sitemap.xml`

### 3. Netlify (déjà configuré)
- Site indexable : ✅
- HTTPS : ✅ 
- Redirect www → non-www : ✅
- Headers SEO : ✅

---

## 🤖 Intégration IA (MCP Server)

### Fichier de config Claude Desktop
Ajouter dans `%APPDATA%\Claude\claude_desktop_config.json` :
```json
{
  "mcpServers": {
    "sunu-yoon": {
      "command": "node",
      "args": ["C:/Users/lydie/OneDrive/Bureau/SUNU YOON/mcp-server/index.js"]
    }
  }
}
```

### Test MCP
```bash
cd mcp-server
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node index.js
```

### Outils MCP disponibles
- `search_rides` — Chercher des covoiturages
- `get_recent_rides` — Trajets récents
- `get_ride_details` — Détails d'un trajet
- `book_ride` — Réserver (sans inscription)
- `get_ride_requests` — Demandes de passagers
- `create_ride_request` — Publier une demande
- `sunu_yoon_info` — Infos sur Sunu Yoon

---

## 📊 Mots-clés ciblés

### Français (principal)
covoiturage sénégal, covoiturage dakar, covoiturage thiès, covoiturage saint-louis,
transport partagé sénégal, trajet partagé dakar, voyage économique sénégal,
publier un trajet, réserver un trajet, partage de frais transport

### Wolof
sunu yoon (notre voyage), dem ci sénégal

### Routes populaires
Dakar Saint-Louis, Dakar Thiès, Dakar Mbour, Dakar Touba, Dakar Kaolack,
Dakar Ziguinchor, Thiès Mbour

### Anglais (touristes/expats)
carpooling senegal, rideshare dakar, senegal travel sharing, book ride senegal
