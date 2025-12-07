const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const caURL = "https://localhost:7054";
const caCertPath = "/home/dakshin-jeeva/Projects/gps_tracker/crypto/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem";

async function registerUser(email) {
  const ca = new FabricCAServices(
    caURL,
    { trustedRoots: fs.readFileSync(caCertPath), verify: true },
    "ca-org1"
  );

  const wallet = await Wallets.newFileSystemWallet(path.join(__dirname, 'wallet'));


  const adminIdentity = await wallet.get('admin');
  if (!adminIdentity) throw new Error("Admin not enrolled!");

  const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
  const adminUser = await provider.getUserContext(adminIdentity, 'admin');

  await ca.register({
    enrollmentID: email,
    enrollmentSecret: email + "_secret",
    role: "client"
  }, adminUser);

  return email + "_secret";
}

module.exports = registerUser;
