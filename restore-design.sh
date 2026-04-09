#!/bin/bash
# Run this script to restore the PREVIOUS design (before the Google Stitch redesign)
# Usage: bash restore-design.sh

BACKUP_DIR=".design-backup"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Error: Design backup directory not found. Cannot restore."
  exit 1
fi

echo "Restoring previous design..."

cp "$BACKUP_DIR/Layout.tsx" src/components/Layout.tsx
cp "$BACKUP_DIR/DashboardPage.tsx" src/pages/DashboardPage.tsx
cp "$BACKUP_DIR/TestsPage.tsx" src/pages/TestsPage.tsx
cp "$BACKUP_DIR/ChatPage.tsx" src/pages/ChatPage.tsx
cp "$BACKUP_DIR/index.css" src/index.css

echo ""
echo "Previous design restored! Now deploy with:"
echo "  npx vercel --prod"
echo ""
echo "You can delete the backup folder after confirming:"
echo "  rm -rf $BACKUP_DIR restore-design.sh"
