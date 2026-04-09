#!/bin/bash
# Run this script to restore original Vidyaa branding (remove VSPS co-branding)
# Usage: bash restore-branding.sh

BACKUP_DIR=".branding-backup"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Error: Backup directory not found. Cannot restore."
  exit 1
fi

echo "Restoring original Vidyaa branding..."

cp "$BACKUP_DIR/constants-index.ts" src/constants/index.ts
cp "$BACKUP_DIR/Layout.tsx" src/components/Layout.tsx
cp "$BACKUP_DIR/LoginPage.tsx" src/pages/LoginPage.tsx
cp "$BACKUP_DIR/OnboardingPage.tsx" src/pages/OnboardingPage.tsx
cp "$BACKUP_DIR/index.html" index.html

echo ""
echo "Branding restored! Now deploy with:"
echo "  npx vercel --prod"
echo ""
echo "You can delete the backup folder after confirming:"
echo "  rm -rf $BACKUP_DIR restore-branding.sh"
