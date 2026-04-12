#!/bin/bash
# Audit all Lambda functions for vulnerabilities

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
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 AUDITING: $func"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    (cd "$func" && npm audit)
    total=$(cd "$func" && npm audit --json 2>/dev/null | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);console.log(j?.metadata?.vulnerabilities?.total ?? "ERR");}catch{console.log("ERR");}});' || echo "ERR")
    echo "TOTAL: $total"
    echo ""
  fi
done
