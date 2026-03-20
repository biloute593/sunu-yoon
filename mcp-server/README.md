# 🚗 Sunu Yoon MCP Server

Serveur **MCP** (Model Context Protocol) pour [Sunu Yoon](https://sunuyoon.net) — la plateforme de covoiturage au Sénégal.

Permet aux assistants IA (ChatGPT Desktop, Claude Desktop, Cursor, Windsurf, etc.) de **rechercher et réserver des covoiturages** directement à travers une conversation.

## 🛠️ Outils disponibles

| Outil | Description |
|-------|-------------|
| `search_rides` | Chercher des trajets entre deux villes (+ date, places) |
| `get_recent_rides` | Voir les derniers trajets publiés |
| `get_ride_details` | Détails complets d'un trajet |
| `book_ride` | Réserver des places (sans inscription) |
| `get_ride_requests` | Voir les demandes de passagers |
| `create_ride_request` | Publier une demande de trajet |
| `sunu_yoon_info` | Infos générales sur Sunu Yoon |

## ⚡ Installation rapide

```bash
cd mcp-server
npm install
```

## 🔌 Configuration

### Claude Desktop

Fichier `claude_desktop_config.json` :
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

### ChatGPT Desktop (quand MCP sera supporté)

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

### Cursor / VS Code Copilot

Dans `.vscode/mcp.json` :
```json
{
  "servers": {
    "sunu-yoon": {
      "command": "node",
      "args": ["./mcp-server/index.js"]
    }
  }
}
```

## 🧪 Tester

```bash
# Vérifier que le serveur démarre
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node index.js
```

## 📖 Exemples de conversation

> **Utilisateur** : Je cherche un covoiturage de Dakar à Saint-Louis demain
> 
> **IA** : *utilise `search_rides`* → Voici 3 trajets disponibles...

> **Utilisateur** : Réserve 2 places sur le trajet #1 pour Moussa Diop, 77 123 45 67, paiement Wave
> 
> **IA** : *utilise `book_ride`* → ✅ Réservation confirmée ! Le conducteur va vous contacter.

## 🌍 Villes desservies

Dakar, Thiès, Saint-Louis, Touba, Kaolack, Ziguinchor, Mbour, Saly, Tambacounda, Kolda, Fatick, Diourbel, Louga, Matam, Kédougou, Sédhiou, Pikine, Guédiawaye, Rufisque, Cap Skirring, Diamniadio et toutes les villes du Sénégal.

## 📄 Licence

MIT — Sunu Yoon © 2025
