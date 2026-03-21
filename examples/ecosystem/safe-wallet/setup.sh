#!/bin/bash
set -e

cd apps/mobile

if [ ! -f .env.local ]; then
  sed 's/APP_VARIANT=production/APP_VARIANT=development/; s/EXPO_PUBLIC_APP_VARIANT=production/EXPO_PUBLIC_APP_VARIANT=development/' .env.example > .env.local
fi

yarn install

cat <<'EOF' > google-services-dev.json
{
  "project_info": {
    "project_number": "6383746662448396887",
    "project_id": "global-safe-mobileapp-dev",
    "storage_bucket": "global-safe-mobileapp-dev.firebasestorage.app"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:6383746662448396887:android:91b181164162ffa17462d5",
        "android_client_info": {
          "package_name": "global.safe.mobileapp.dev"
        }
      },
      "oauth_client": [],
      "api_key": [
        {
          "current_key": "WW91IGxvc3QgdGhlIGdhbWU="
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": []
        }
      }
    }
  ],
  "configuration_version": "1"
}
EOF

echo "Running expo prebuild for Android..."
npx expo prebuild --platform android --clean --non-interactive

echo "Setup complete. Run 'yarn android' from apps/mobile to build and launch."
