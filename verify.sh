#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[!]${NC} $1"; }

echo ""
echo "=========================================="
echo "Network Verification"
echo "=========================================="
echo ""

# Check Docker containers
echo "Container Status:"
echo "----------------------------------------"

CONTAINERS=("orderer.example.com" "peer0.org1.example.com" "peer0.org2.example.com" "cli")
ALL_RUNNING=true

for container in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        STATUS=$(docker inspect -f '{{.State.Status}}' $container)
        if [ "$STATUS" = "running" ]; then
            print_info "$container: Running"
        else
            print_error "$container: $STATUS"
            ALL_RUNNING=false
        fi
    else
        print_error "$container: Not found"
        ALL_RUNNING=false
    fi
done

echo ""

if [ "$ALL_RUNNING" = false ]; then
    print_error "Some containers are not running!"
    echo ""
    echo "To start the network:"
    echo "  docker-compose up -d"
    echo ""
    exit 1
fi

# Check peer logs for errors
echo "Checking Peer Logs:"
echo "----------------------------------------"

PEER1_ERRORS=$(docker logs peer0.org1.example.com 2>&1 | grep -i "error\|fatal" | tail -5)
PEER2_ERRORS=$(docker logs peer0.org2.example.com 2>&1 | grep -i "error\|fatal" | tail -5)

if [ -z "$PEER1_ERRORS" ]; then
    print_info "Peer0.Org1: No critical errors"
else
    print_warn "Peer0.Org1: Found errors (check logs)"
    echo "$PEER1_ERRORS" | head -2
fi

if [ -z "$PEER2_ERRORS" ]; then
    print_info "Peer0.Org2: No critical errors"
else
    print_warn "Peer0.Org2: Found errors (check logs)"
    echo "$PEER2_ERRORS" | head -2
fi

echo ""

# Check if peers can be reached from CLI container
echo "Network Connectivity:"
echo "----------------------------------------"

# Test Org1 connectivity
if docker exec cli peer channel list \
    -e CORE_PEER_LOCALMSPID=Org1MSP \
    -e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    > /dev/null 2>&1; then
    print_info "Can connect to Peer0.Org1"
else
    print_error "Cannot connect to Peer0.Org1"
fi

# Test Org2 connectivity
if docker exec cli peer channel list \
    -e CORE_PEER_LOCALMSPID=Org2MSP \
    -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
    > /dev/null 2>&1; then
    print_info "Can connect to Peer0.Org2"
else
    print_error "Cannot connect to Peer0.Org2"
fi

echo ""

# Check channels
echo "Channels:"
echo "----------------------------------------"

ORG1_CHANNELS=$(docker exec \
    -e CORE_PEER_LOCALMSPID=Org1MSP \
    -e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    cli peer channel list 2>/dev/null | grep -v "Channels peers has joined:")

ORG2_CHANNELS=$(docker exec \
    -e CORE_PEER_LOCALMSPID=Org2MSP \
    -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
    cli peer channel list 2>/dev/null | grep -v "Channels peers has joined:")

if [ -n "$ORG1_CHANNELS" ]; then
    print_info "Org1 channels: $ORG1_CHANNELS"
else
    print_warn "Org1: No channels joined yet"
fi

if [ -n "$ORG2_CHANNELS" ]; then
    print_info "Org2 channels: $ORG2_CHANNELS"
else
    print_warn "Org2: No channels joined yet"
fi

echo ""
echo "=========================================="

if [ -z "$ORG1_CHANNELS" ] || [ -z "$ORG2_CHANNELS" ]; then
    echo ""
    print_info "Network is running but no channels created yet"
    echo ""
    echo "Next step: Run './create-channel-docker.sh' to create channel"
else
    echo ""
    print_info "Network is fully operational! ✓"
fi

echo ""