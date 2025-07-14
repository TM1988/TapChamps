#!/bin/bash

# 🚀 Deploy Tap Champs to Railway
echo "🎮 Deploying Tap Champs to Railway..."

# Add all changes
git add .

# Commit with timestamp
git commit -m "Update Tap Champs - $(date)"

# Push to main branch (triggers Railway deployment)
git push

echo "✅ Deployment triggered!"
echo "🌐 Your game will be live at: https://tapchamps-production.up.railway.app"
echo "⏳ Railway is rebuilding... Check https://railway.app dashboard"
