#!/bin/bash
# Fix vulnerabilities in all Lambda functions

FUNCTIONS=(
  EchoEcho
  WelcomeMsg
  RandomNumber
  getAlbums
  getPhotos
  getPhotosRandom
  getBucketkey
)

for func in "${FUNCTIONS[@]}"; do
  if [ -d "$func" ] && [ -f "$func/package.json" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔧 FIXING: $func"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    (cd "$func" && npm install && npm audit fix)
    echo ""
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Auditing after fixes..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for func in "${FUNCTIONS[@]}"; do
  if [ -d "$func" ]; then
    total=$(cd "$func" && npm audit --json 2>/dev/null | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);console.log(j?.metadata?.vulnerabilities?.total ?? "ERR");}catch{console.log("ERR");}});' || echo "ERR")
    echo "$func: total_vulnerabilities=$total"
  fi
done
