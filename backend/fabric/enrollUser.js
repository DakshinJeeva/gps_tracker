const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const caURL = "https://localhost:7054";
const caCertPath = "/home/dakshin-jeeva/Projects/gps_tracker/crypto/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem";

async function enrollUser(email, secret) {
  const ca = new FabricCAServices(
    caURL,
    { trustedRoots: fs.readFileSync(caCertPath), verify: true },
    "ca-org1"
  );

  const wallet = await Wallets.newFileSystemWallet("./wallet");

  const enrollment = await ca.enroll({
    enrollmentID: email,
    enrollmentSecret: secret,
  });

  const identity = {
    credentials: {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(),
    },
    mspId: "Org1MSP",
    type: "X.509",
  };

  await wallet.put(email, identity);

  return identity;
}

module.exports = enrollUser;
