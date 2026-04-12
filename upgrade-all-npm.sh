#!/bin/bash
# Upgrade npm packages for all Lambda functions

FUNCTIONS=(
  EchoEcho
  WelcomeMsg
  RandomNumber
  Status
  Profile
  getAlbums
  getPhotos
  getPhotosRandom
  getBucketkey
)

for func in "${FUNCTIONS[@]}"; do
  if [ -d "$func" ] && [ -f "$func/package.json" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Upgrading: $func"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    (cd "$func" && npm upgrade && npm audit fix --force)
    echo ""
  else
    echo "⚠️  Skipping $func (not found or no package.json)"
  fi
done

echo "✅ All functions upgraded!"
