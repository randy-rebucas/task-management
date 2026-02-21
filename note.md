# Dev test
curl -H "Authorization: Bearer change-me-to-a-random-secret" http://localhost:3000/api/cron/notify

# Vercel cron (vercel.json)
{ "crons": [{ "path": "/api/cron/notify", "schedule": "0 * * * *" }] }
