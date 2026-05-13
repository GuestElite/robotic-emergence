#!/usr/bin/env bash
# ================================================================
#   Robotic Emergence — Lanceur du prototype web pour macOS / Linux
#   Sur macOS : double-clique sur ce fichier.
#   Sur Linux  : ./launch-prototype.command
# ================================================================

cd "$(dirname "$0")" || exit 1

PORT=8765
URL="http://localhost:${PORT}/prototype/"

echo ""
echo "==============================================="
echo "  ROBOTIC EMERGENCE - Prototype V0"
echo "==============================================="
echo ""
echo "Serveur local : ${URL}"
echo "(Le navigateur s'ouvrira automatiquement)"
echo ""
echo "Pour arrêter le serveur : ferme cette fenêtre"
echo "                          ou appuie sur Ctrl+C"
echo ""

# Ouvre le navigateur après 2 secondes (laisse le temps au serveur de démarrer)
(
  sleep 2
  if command -v open >/dev/null 2>&1; then
    open "${URL}"      # macOS
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${URL}"  # Linux
  fi
) &

# Tente python3 en premier (recommandé)
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server ${PORT}
fi

# Sinon python (Python 2 / système ancien)
if command -v python >/dev/null 2>&1; then
  exec python -m http.server ${PORT}
fi

# Sinon Node + npx http-server
if command -v node >/dev/null 2>&1; then
  exec npx -y http-server -p ${PORT}
fi

echo ""
echo "[ERREUR] Ni Python ni Node trouvés sur ce système."
echo ""
echo "Installe Python 3 :"
echo "  • macOS : brew install python3   (ou https://www.python.org/downloads/)"
echo "  • Linux : sudo apt install python3 (ou équivalent)"
echo ""
read -n 1 -s -r -p "Appuie sur une touche pour quitter..."
echo ""
exit 1
