#!/bin/bash

# SEO Files Testing Script for cmtaudit.tn

echo "════════════════════════════════════════════════════════════════"
echo "                  CMTAUDIT.TN SEO FILES TESTING"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Define the base URL
BASE_URL="https://cmtaudit.tn"

# Array of SEO files to test
SEO_FILES=(
  "robots.txt"
  "sitemap.xml"
  "sitemap-mobile.xml"
  "sitemap-index.xml"
  ".well-known/security.txt"
)

echo "Testing SEO File Accessibility..."
echo ""

for file in "${SEO_FILES[@]}"; do
  echo "📄 Testing: $BASE_URL/$file"
  
  # Perform HEAD request to get HTTP status and headers
  response=$(curl -s -I "$BASE_URL/$file" 2>&1)
  
  # Extract HTTP status code
  status=$(echo "$response" | head -1 | awk '{print $2}')
  
  # Extract content type
  content_type=$(echo "$response" | grep -i "content-type:" | cut -d' ' -f2-)
  
  # Extract content length
  content_length=$(echo "$response" | grep -i "content-length:" | cut -d' ' -f2-)
  
  # Extract last modified date
  last_modified=$(echo "$response" | grep -i "last-modified:" | cut -d' ' -f2-)
  
  if [ "$status" = "200" ]; then
    echo "✅ Status: $status OK"
    echo "   Content-Type: $content_type"
    echo "   Content-Length: ${content_length:-N/A} bytes"
    [ -n "$last_modified" ] && echo "   Last-Modified: $last_modified"
  else
    echo "❌ Status: $status FAILED"
  fi
  echo ""
done

echo "════════════════════════════════════════════════════════════════"
echo "                    DNS RESOLUTION TESTS"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Test DNS resolution
echo "🌐 Testing DNS Resolution for cmtaudit.tn"
echo ""

# Test with Google DNS
echo "Google DNS (8.8.8.8):"
nslookup cmtaudit.tn 8.8.8.8 | grep -E "Address:|Name:"
echo ""

# Test with Cloudflare DNS
echo "Cloudflare DNS (1.1.1.1):"
nslookup cmtaudit.tn 1.1.1.1 | grep -E "Address:|Name:"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "                     HTTPS CERTIFICATE INFO"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Test SSL certificate
echo "🔒 SSL Certificate Details:"
echo ""
echo -n | openssl s_client -servername cmtaudit.tn -connect cmtaudit.tn:443 2>/dev/null | openssl x509 -noout -dates -issuer -subject
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "                  PORT AVAILABILITY CHECK"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Test critical ports
PORTS=(80 443 5000 4173)
for port in "${PORTS[@]}"; do
  if netstat -tuln 2>/dev/null | grep -q ":$port "; then
    echo "✅ Port $port: LISTENING"
  else
    echo "❌ Port $port: NOT LISTENING"
  fi
done

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "                        TEST COMPLETE"
echo "════════════════════════════════════════════════════════════════"
