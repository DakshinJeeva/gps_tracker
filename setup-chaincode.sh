#!/bin/bash
# Setup JavaScript Chaincode

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[STEP]${NC} $1"; }

print_info "=========================================="
print_info "Setting up JavaScript Chaincode"
print_info "=========================================="
echo ""

# Create chaincode directory structure
print_warn "Creating chaincode directory structure..."
mkdir -p chaincode/vehicle-tracking-js

# Create package.json
print_warn "Creating package.json..."
cat > chaincode/vehicle-tracking-js/package.json << 'EOF'
{
  "name": "vehicle-tracking-chaincode",
  "version": "1.0.0",
  "description": "Vehicle tracking chaincode for Hyperledger Fabric",
  "main": "index.js",
  "scripts": {
    "start": "fabric-chaincode-node start"
  },
  "dependencies": {
    "fabric-contract-api": "^2.5.0",
    "fabric-shim": "^2.5.0"
  },
  "author": "",
  "license": "Apache-2.0"
}
EOF

print_info "✓ package.json created"

# Copy index.js (you need to create this separately or paste it)
print_warn "Please create index.js file..."
echo ""
echo "Copy the index.js content from the artifact to:"
echo "  chaincode/vehicle-tracking-js/index.js"
echo ""
echo "Then run: ./deploy-js-chaincode.sh"
echo ""

print_info "=========================================="
print_info "Chaincode structure ready!"
print_info "=========================================="
echo ""
echo "Directory structure:"
echo "chaincode/"
echo "└── vehicle-tracking-js/"
echo "    ├── package.json  ✓"
echo "    └── index.js      (create this)"
echo ""