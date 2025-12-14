#!/usr/bin/env pwsh

# Script de déploiement automatique Render
# Usage: .\deploy-render.ps1 -Token "your_render_api_token"

param(
    [string]$Token = $env:RENDER_API_TOKEN,
    [string]$GitRepo = "https://github.com/biloute593/sunu-yoon.git",
    [string]$BranchName = "master"
)

Write-Host "🚀 Lancement du déploiement Render..." -ForegroundColor Green
Write-Host ""

# Lien direct vers le déploiement Blueprint
$blueprintUrl = "https://render.com/deploy?repo=https://github.com/biloute593/sunu-yoon"

Write-Host "✅ Clique sur ce lien pour déployer directement:" -ForegroundColor Green
Write-Host $blueprintUrl -ForegroundColor Cyan
Write-Host ""

# Ouvrir le lien automatiquement
Start-Process $blueprintUrl

Write-Host "✓ Le lien de déploiement a été ouvert dans ton navigateur"
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Yellow
Write-Host "1. La page Render s'ouvrira avec ton repo pré-sélectionné"
Write-Host "2. Clique sur 'Connect GitHub' si ce n'est pas fait"
Write-Host "3. Vérifie les variables d'environnement"
Write-Host "4. Clique Deploy pour lancer le déploiement"
Write-Host ""
Write-Host "Temps estimé: 5-10 minutes" -ForegroundColor Cyan
