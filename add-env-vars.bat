@echo off
echo ===============================================
echo  Adding Environment Variables to Vercel
echo ===============================================
echo.

echo Adding SUPABASE_URL...
echo https://kuusdjdjyhkxmyvafodl.supabase.co | vercel env add SUPABASE_URL production preview development

echo.
echo Adding SUPABASE_ANON_KEY...
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dXNkamRqeWhreG15dmFmb2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MTY3MzUsImV4cCI6MjA3OTI5MjczNX0.Y9kT8laNVdHEJkHdvBlPSY4002wZEPtjSQB-v1ztEr0 | vercel env add SUPABASE_ANON_KEY production preview development

echo.
echo Adding JWT_SECRET...
echo dK8_secure_random_key_change_in_production_2024 | vercel env add JWT_SECRET production preview development

echo.
echo Adding MPESA_CONSUMER_KEY...
echo 2XvtvviqoLjKhGd2erFdSYYxryzqM0YOi0pp2FEMo2gW94In | vercel env add MPESA_CONSUMER_KEY production preview development

echo.
echo Adding MPESA_CONSUMER_SECRET...
echo nk8Bt2nLBw1YHyr5ZzIXhEDCAUWTmEeP6YASr3oz28bHAtrljrOSEZ4qqb1JFk05 | vercel env add MPESA_CONSUMER_SECRET production preview development

echo.
echo Adding MPESA_SHORTCODE...
echo 174379 | vercel env add MPESA_SHORTCODE production preview development

echo.
echo Adding MPESA_PASSKEY...
echo bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919 | vercel env add MPESA_PASSKEY production preview development

echo.
echo Adding MPESA_CALLBACK_URL...
echo https://oneal-wifi-kv53a11ak-drewgalowaydevs-projects.vercel.app/api/mpesa/callback | vercel env add MPESA_CALLBACK_URL production preview development

echo.
echo Adding MIKROTIK_HOST...
echo 192.168.1.1 | vercel env add MIKROTIK_HOST production preview development

echo.
echo Adding MIKROTIK_USER...
echo admin | vercel env add MIKROTIK_USER production preview development

echo.
echo Adding MIKROTIK_PASS...
echo your_mikrotik_password | vercel env add MIKROTIK_PASS production preview development

echo.
echo ===============================================
echo  All environment variables added!
echo  Run: vercel --prod
echo  to redeploy with new environment variables
echo ===============================================
