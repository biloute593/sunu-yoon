# Script pour corriger App.tsx
$encoding = [System.Text.UTF8Encoding]::new($false)
$filePath = "c:\Users\lydie\OneDrive\Bureau\SUNU YOON\App.tsx"

# Lire le fichier
$content = [System.IO.File]::ReadAllText($filePath, $encoding)

# Appliquer les remplacements
$content = $content -replace 'minimum 500 F','votre tarif'
$content = $content -replace 'value < 500','value < 1'
$content = $content -replace 'Ajustez librement à partir de 500 F','💡 Tapez librement le tarif de votre choix'
$content = $content -replace 'className="relative z-20 px-4 mt-8">','className="relative z-20 px-4 mt-32 mb-12">'

# Écrire le fichier
[System.IO.File]::WriteAllText($filePath, $content, $encoding)

Write-Host "✅ Modifications appliquées avec succès!" -ForegroundColor Green
