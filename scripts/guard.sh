#!/usr/bin/env bash
set -uo pipefail
fail=0
chk() {  # name, command that should produce NO output
  out=$(eval "$2" 2>/dev/null)
  if [ -n "$out" ]; then echo "FAIL: $1"; echo "$out" | head -20; fail=1
  else echo "PASS: $1"; fi
}

chk "no box-shadow" \
  "grep -rn 'box-shadow\|shadow-md\|shadow-lg\|shadow-sm\|drop-shadow' app components --include=*.tsx --include=*.css"

chk "no hardcoded hex outside globals.css" \
  "grep -rnE '#[0-9a-fA-F]{6}' app components lib --include=*.tsx --include=*.ts | grep -v globals.css"

chk "no oversized radius" \
  "grep -rn 'rounded-lg\|rounded-xl\|rounded-2xl\|rounded-3xl' app components --include=*.tsx"

chk "no inline Gujarati in components" \
  "grep -rnP '[\x{0A80}-\x{0AFF}]' app components --include=*.tsx | grep -v 'lib/i18n'"

chk "no select star on balako" \
  "grep -rn \"from('balako').select('\\*'\" app lib components"

chk "no hard delete of core records" \
  "grep -rnE \"\.delete\(\).*from\('(balako|attendance|ahnik_weeks|sabha_sessions)'\)\" app lib"

chk "no deprecated auth-helpers" \
  "grep -rn 'auth-helpers' app lib components --include=*.ts --include=*.tsx"

chk "no pdf libraries" \
  "grep -nE '\"(jspdf|pdfmake|@react-pdf/renderer)\"' package.json"

chk "no browser storage in app code" \
  "grep -rn 'localStorage\|sessionStorage' app components --include=*.tsx | grep -v 'more/language'"

chk "service role never imported client side" \
  "grep -rln \"supabase/admin\" app components --include=*.tsx | xargs -r grep -l \"'use client'\""

exit $fail
