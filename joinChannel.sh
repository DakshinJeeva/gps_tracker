# Export environment variables
export FABRIC_CFG_PATH=$PWD/config
export ORDERER_CA=$PWD/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt
export ORDERER_ADDRESS=orderer.example.com:7050

# Set Org1 environment
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_MSPCONFIGPATH=$PWD/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=$PWD/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt

# Create channel
peer channel create \
  -o $ORDERER_ADDRESS \
  -c vehicletracking \
  -f ./channel-artifacts/vehicletracking.tx \
  --outputBlock ./channel-artifacts/vehicletracking.block \
  --tls --cafile $ORDERER_CA

# Org1 joins channel
peer channel join -b ./channel-artifacts/vehicletracking.block

# Update Org1 anchor peer
peer channel update \
  -o $ORDERER_ADDRESS \
  -c vehicletracking \
  -f ./channel-artifacts/Org1MSPanchors.tx \
  --tls --cafile $ORDERER_CA

# Set Org2 environment
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_MSPCONFIGPATH=$PWD/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=peer0.org2.example.com:9051
export CORE_PEER_TLS_ROOTCERT_FILE=$PWD/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt

# Org2 joins channel
peer channel join -b ./channel-artifacts/vehicletracking.block

# Update Org2 anchor peer
peer channel update \
  -o $ORDERER_ADDRESS \
  -c vehicletracking \
  -f ./channel-artifacts/Org2MSPanchors.tx \
  --tls --cafile $ORDERER_CA