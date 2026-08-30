#!/bin/bash
# BillSplit AI - Firebase Setup & Deploy Script
# This script:
# 1. Creates a Firebase project
# 2. Enables required services
# 3. Creates .env file with all config
# 4. Builds and deploys the app

set -e

echo "🚀 BillSplit AI - Firebase Setup"
echo "================================"

GEMINI_KEY="AQ.Ab8RN6IHE375osRsh9tpAgym3Q00rfctxZWXK3zezVSUp4VvtA"
PROJECT_ID="billsplit-ai-$(date +%s | tail -c 6)"

echo ""
echo "📋 Step 1: Checking Firebase login..."
npx -y firebase-tools@latest login --no-localhost 2>&1 || true

echo ""
echo "📦 Step 2: Creating Firebase project: $PROJECT_ID"
npx firebase-tools@latest projects:create "$PROJECT_ID" --display-name "BillSplit AI" 2>&1 || {
  echo "Project may already exist, continuing..."
}

echo ""
echo "🔥 Step 3: Using project $PROJECT_ID"
npx firebase-tools@latest use "$PROJECT_ID" 2>&1

echo ""
echo "⚙️  Step 4: Adding Firebase web app..."
APP_OUTPUT=$(npx firebase-tools@latest apps:create WEB "BillSplit AI Web" --project "$PROJECT_ID" 2>&1)
echo "$APP_OUTPUT"

echo ""
echo "🔑 Step 5: Getting Firebase web config..."
APP_ID=$(npx firebase-tools@latest apps:list WEB --project "$PROJECT_ID" --json 2>&1 | python3 -c "import sys,json; data=json.load(sys.stdin); print(data['result'][0]['appId'])" 2>/dev/null || echo "")

if [ -z "$APP_ID" ]; then
  echo "Could not get app ID automatically. Please run the manual setup."
  exit 1
fi

CONFIG_JSON=$(npx firebase-tools@latest apps:sdkconfig WEB "$APP_ID" --project "$PROJECT_ID" --json 2>&1 | python3 -c "import sys,json; data=json.load(sys.stdin); print(json.dumps(data['result']['sdkConfig']))" 2>/dev/null || echo "{}")

echo "Config: $CONFIG_JSON"

# Parse config values
API_KEY=$(echo "$CONFIG_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('apiKey',''))" 2>/dev/null || echo "")
AUTH_DOMAIN=$(echo "$CONFIG_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('authDomain',''))" 2>/dev/null || echo "")
DB_URL=$(echo "$CONFIG_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('databaseURL',''))" 2>/dev/null || echo "")
PROJECT_ID_CFG=$(echo "$CONFIG_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('projectId',''))" 2>/dev/null || echo "$PROJECT_ID")
STORAGE_BUCKET=$(echo "$CONFIG_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('storageBucket',''))" 2>/dev/null || echo "")
MSG_SENDER=$(echo "$CONFIG_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('messagingSenderId',''))" 2>/dev/null || echo "")
APP_ID_CFG=$(echo "$CONFIG_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('appId',''))" 2>/dev/null || echo "$APP_ID")

echo ""
echo "📝 Step 6: Creating .env.local..."
cat > .env.local << EOF
VITE_FIREBASE_API_KEY=$API_KEY
VITE_FIREBASE_AUTH_DOMAIN=$AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=$PROJECT_ID_CFG
VITE_FIREBASE_STORAGE_BUCKET=$STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=$MSG_SENDER
VITE_FIREBASE_APP_ID=$APP_ID_CFG
VITE_GEMINI_API_KEY=$GEMINI_KEY
EOF

echo ".env.local created!"
cat .env.local

echo ""
echo "🔥 Step 7: Initializing Firestore..."
npx firebase-tools@latest firestore:databases:create "(default)" --location=us-east1 --project "$PROJECT_ID" 2>&1 || echo "Firestore may already exist"

echo ""
echo "📋 Step 8: Deploying Firestore rules..."
npx firebase-tools@latest deploy --only firestore:rules --project "$PROJECT_ID" 2>&1

echo ""
echo "🏗️  Step 9: Building React app..."
npm run build

echo ""
echo "🌐 Step 10: Deploying to Firebase Hosting..."
npx firebase-tools@latest deploy --only hosting --project "$PROJECT_ID" 2>&1

echo ""
echo "✅ DONE! Your app is live!"
echo "🌍 Visit: https://$PROJECT_ID.web.app"
