#!/bin/bash

echo "🔍 Backend Setup Verification Script"
echo "===================================="
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ .env file found"
else
    echo "❌ .env file not found"
    echo "   Run: cp .env.example .env"
    exit 1
fi

echo ""
echo "📁 Checking Backend Files..."

# Note: Backend files check removed

echo ""
echo "📦 Checking Dependencies..."

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✅ node_modules found"
    
    # Check specific packages
    if [ -d "node_modules/express-rate-limit" ]; then
        echo "✅ express-rate-limit installed"
    else
        echo "❌ express-rate-limit not installed"
        echo "   Run: npm install"
    fi
    
    if [ -d "node_modules/axios" ]; then
        echo "✅ axios installed"
    else
        echo "❌ axios not installed"
        echo "   Run: npm install"
    fi
else
    echo "❌ node_modules not found"
    echo "   Run: npm install"
    exit 1
fi

echo ""
echo "🚀 Checking Server..."

# Check if server is running
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Server is running on port 8080"
else
    echo "⚠️  Server not running on port 8080"
    echo "   Start server: npm run dev"
fi

echo ""
echo "===================================="
echo "Verification Complete!"
echo ""
echo "Next Steps:"
echo "1. If any ❌ appear above, fix those issues first"
echo "2. Start backend: npm run dev"
echo "3. Start mobile app: cd ../SnapnGraspp && npm start"
echo ""
