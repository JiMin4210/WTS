#!/usr/bin/env bash
set -euo pipefail

# ===== 설정 =====
S3_BUCKET="wts-web-prod"
CF_DIST_ID="E382F3IP2MA4CT"   # ← 네 CloudFront 배포 ID로 교체
BUILD_DIR="dist"

echo "🚀 WTS deploy start"

# 0) clean (로컬 dist 찌꺼기 방지)
echo "🧹 cleaning dist..."
rm -rf "$BUILD_DIR"

# 1) build (끝날 때까지 기다림)
echo "📦 building..."
npm run build

# 1-1) 빌드 산출물 체크 (실수 방지)
if [ ! -f "$BUILD_DIR/index.html" ]; then
  echo "❌ build failed: dist/index.html not found"
  exit 1
fi

echo "✅ build done: $BUILD_DIR/index.html exists"

# 2) upload to S3 (dist 내용을 버킷 루트로 동기화)
echo "☁️ uploading to S3..."
aws s3 sync "$BUILD_DIR" "s3://$S3_BUCKET" --delete

# 3) invalidate CloudFront
echo "♻️ invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$CF_DIST_ID" \
  --paths "/*"

echo "✅ deploy finished"
