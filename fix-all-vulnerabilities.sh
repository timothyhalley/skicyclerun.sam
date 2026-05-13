#!/bin/bash
# Fix vulnerabilities in all top-level Lambda packages.

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1
NPM_CACHE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/skicyclerun-npm-cache.XXXXXX")"

cleanup() {
  rm -rf "$NPM_CACHE_DIR"
}

trap cleanup EXIT

FUNCTIONS=()
while IFS= read -r func; do
  FUNCTIONS+=("$func")
done < <(
  find . -mindepth 2 -maxdepth 2 -name package.json \
    -not -path './node_modules/*' \
    -not -path './common/*' \
    -not -path './shared/*' \
    -print | sed 's#^\./##; s#/package.json$##' | sort
)

if [ "${#FUNCTIONS[@]}" -eq 0 ]; then
  echo "No package.json files found."
  exit 1
fi

for func in "${FUNCTIONS[@]}"; do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔧 FIXING: $func"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  (
    cd "$func" || exit 1
    npm --cache "$NPM_CACHE_DIR" update
    npm --cache "$NPM_CACHE_DIR" audit fix
  )
  echo ""
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Auditing after fixes..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for func in "${FUNCTIONS[@]}"; do
  if [ -f "$func/package-lock.json" ]; then
    total=$(cd "$func" && npm --cache "$NPM_CACHE_DIR" audit --json 2>/dev/null | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);console.log(j?.metadata?.vulnerabilities?.total ?? "ERR");}catch{console.log("ERR");}});' || echo "ERR")
    if grep -Eq 'fast-xml-parser-5\.[0-6]\.|fast-xml-builder-1\.1\.[0-6]\b|uuid-13\.0\.0\.tgz' "$func/package-lock.json"; then
      vulnerable_lockfile="yes"
    else
      vulnerable_lockfile="no"
    fi
    echo "$func: total_vulnerabilities=$total vulnerable_lockfile=$vulnerable_lockfile"
  else
    echo "$func: package-lock.json missing"
  fi
done
