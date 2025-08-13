#!/bin/bash

echo "🔄 Restarting development server..."

# Останавливаем все процессы на порту 5173
echo "📛 Stopping processes on port 5173..."
pkill -f "vite.*5173" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true

# Ждем немного для завершения процессов
sleep 2

# Очищаем кэш Vite
echo "🧹 Clearing Vite cache..."
rm -rf node_modules/.vite 2>/dev/null || true
rm -rf dist 2>/dev/null || true

# Очищаем кэш браузера (если возможно)
echo "🌐 Clearing browser cache hints..."

# Проверяем, что порт свободен
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 5173 is still in use. Trying to force kill..."
    sudo lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Запускаем сервер заново
echo "🚀 Starting development server..."
npm run dev 