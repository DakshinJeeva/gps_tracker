#!/bin/bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_step() { echo -e "${YELLOW}[STEP]${NC} $1"; }

echo "=========================================="
echo "Install Node.js and Deploy Chaincode"
echo "=========================================="
echo ""

# Step 1: Install Node.js in CLI container
print_step "Installing Node.js in CLI container..."
docker exec cli bash -c "
apt-get update -qq > /dev/null 2>&1
apt-get install -y nodejs npm -qq > /dev/null 2>&1
node --version
npm --version
"

if [ $? -ne 0 ]; then
    print_error "Failed to install Node.js"
    exit 1
fi
print_info "Node.js installed"
echo ""

# Step 2: Clea+n old packages
print_step "Cleaning old packages..."
docker exec cli bash -c "rm -f /opt/gopath/src/github.com/hyperledger/fabric/peer/*.tar.gz" 2>/dev/null || true
rm -f *.tar.gz 2>/dev/null || true
print_info "Cleaned"
echo ""

# Step 3: Install npm dependencies
print_step "Installing npm dependencies..."
docker exec cli bash -c "
cd /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/vehicle-tracking-js
rm -rf node_modules package-lock.json
npm install --silent
"
print_info "Dependencies installed"
echo ""

# Step 4: Package chaincode
print_step "Packaging chaincode..."
docker exec cli peer lifecycle chaincode package vehicle-tracking.tar.gz \
    --path /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/vehicle-tracking-js \
    --lang node \
    --label vehicle-tracking_1.0

print_info "Packaged"
echo ""

# Step 5: Verify package type (FIXED)
print_step "Verifying package..."
docker exec cli bash -c "
cd /tmp
tar -xzf /opt/gopath/src/github.com/hyperledger/fabric/peer/vehicle-tracking.tar.gz
cat metadata.json
" > /tmp/metadata_output.txt

cat /tmp/metadata_output.txt
echo ""

# Check if it contains 'type' field
if grep -q '"type"' /tmp/metadata_output.txt; then
    # More robust extraction using sed
    PACKAGE_TYPE=$(grep -o '"type":"[^"]*"' /tmp/metadata_output.txt | sed 's/"type":"//' | sed 's/"//')
    echo "Package type: $PACKAGE_TYPE"
    
    if [ "$PACKAGE_TYPE" != "node" ]; then
        print_error "Package type is wrong: $PACKAGE_TYPE (expected: node)"
        exit 1
    fi
    print_info "Package type correct: node"
else
    print_error "Could not find type in metadata.json"
    exit 1
fi

# Also verify the label for completeness
if grep -q '"label"' /tmp/metadata_output.txt; then
    PACKAGE_LABEL=$(grep -o '"label":"[^"]*"' /tmp/metadata_output.txt | sed 's/"label":"//' | sed 's/"//')
    echo "Package label: $PACKAGE_LABEL"
    
    if [ "$PACKAGE_LABEL" != "vehicle-tracking_1.0" ]; then
        print_error "Package label is wrong: $PACKAGE_LABEL (expected: vehicle-tracking_1.0)"
        exit 1
    fi
    print_info "Package label correct: vehicle-tracking_1.0"
else
    print_error "Could not find label in metadata.json"
    exit 1
fi

echo ""

# Step 6: Test Docker access (fixed)
print_step "Testing Docker access..."

# First check if socket exists
if docker exec peer0.org1.example.com ls /var/run/docker.sock > /dev/null 2>&1; then
    print_info "Docker socket found in peer container"
    
    # Try docker version first (lighter than docker ps)
    if docker exec peer0.org1.example.com docker version > /dev/null 2>&1; then
        print_info "Docker access OK - daemon reachable"
    else
        print_info "WARNING: Docker socket exists but daemon not reachable"
        print_info "Continuing anyway - chaincode building might use external builder"
        # Don't exit here
    fi
else
    print_info "WARNING: Docker socket not mounted in peer"
    print_info "Assuming external builder mode will be used"
    # Don't exit here
fi
echo ""

# Step 7: Install on Org1
print_step "Installing on Org1..."
docker exec \
    -e CORE_PEER_LOCALMSPID=Org1MSP \
    -e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    cli peer lifecycle chaincode install vehicle-tracking.tar.gz

if [ $? -ne 0 ]; then
    print_error "Failed to install on Org1"
    echo ""
    echo "Peer logs:"
    docker logs peer0.org1.example.com 2>&1 | tail -30
    exit 1
fi
print_info "Installed on Org1"
echo ""

# Step 8: Install on Org2
print_step "Installing on Org2..."
docker exec \
    -e CORE_PEER_LOCALMSPID=Org2MSP \
    -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
    cli peer lifecycle chaincode install vehicle-tracking.tar.gz

print_info "Installed on Org2"
echo ""

# Step 9: Get package ID
print_step "Getting package ID..."
PACKAGE_ID=$(docker exec \
    -e CORE_PEER_LOCALMSPID=Org1MSP \
    -e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    cli peer lifecycle chaincode queryinstalled 2>&1 | \
    grep "vehicle-tracking_1.0" | \
    sed 's/.*Package ID: \(.*\), Label.*/\1/')

if [ -z "$PACKAGE_ID" ]; then
    print_error "Could not get package ID"
    exit 1
fi
print_info "Package ID: $PACKAGE_ID"
echo ""

# Step 10: Approve for Org1
print_step "Approving for Org1..."
docker exec \
    -e CORE_PEER_LOCALMSPID=Org1MSP \
    -e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    cli peer lifecycle chaincode approveformyorg \
    -o orderer.example.com:7050 \
    --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt \
    --channelID vehicletracking \
    --name vehicle-tracking \
    --version 1.0 \
    --package-id $PACKAGE_ID \
    --sequence 1

print_info "Approved for Org1"
echo ""

# Step 11: Approve for Org2
print_step "Approving for Org2..."
docker exec \
    -e CORE_PEER_LOCALMSPID=Org2MSP \
    -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
    cli peer lifecycle chaincode approveformyorg \
    -o orderer.example.com:7050 \
    --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt \
    --channelID vehicletracking \
    --name vehicle-tracking \
    --version 1.0 \
    --package-id $PACKAGE_ID \
    --sequence 1

print_info "Approved for Org2"
echo ""

# Step 12: Commit
print_step "Committing chaincode..."
docker exec \
    -e CORE_PEER_LOCALMSPID=Org1MSP \
    -e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    cli peer lifecycle chaincode commit \
    -o orderer.example.com:7050 \
    --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt \
    --channelID vehicletracking \
    --name vehicle-tracking \
    --version 1.0 \
    --sequence 1 \
    --peerAddresses peer0.org1.example.com:7051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    --peerAddresses peer0.org2.example.com:9051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt

print_info "Committed!"
echo ""

print_step "Waiting for chaincode to start (30 seconds)..."
sleep 15

# Step 13: Initialize
print_step "Initializing ledger..."
docker exec \
    -e CORE_PEER_LOCALMSPID=Org1MSP \
    -e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    cli peer chaincode invoke \
    -o orderer.example.com:7050 \
    --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt \
    -C vehicletracking \
    -n vehicle-tracking \
    --peerAddresses peer0.org1.example.com:7051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    --peerAddresses peer0.org2.example.com:9051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
    -c '{"function":"initLedger","Args":[]}'

print_info "Initialized!"
echo ""

echo "=========================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Chaincode containers:"
docker ps --filter "name=dev-peer" --format "table {{.Names}}\t{{.Status}}"
echo ""
echo "Test with:"
echo 'docker exec -e CORE_PEER_LOCALMSPID=Org1MSP -e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt cli peer chaincode query -C vehicletracking -n vehicle-tracking -c '"'"'{"Args":["getAllVehicles"]}'"'"
echo ""

