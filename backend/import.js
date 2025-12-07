const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function importAdmin() {
  const wallet = await Wallets.newFileSystemWallet(path.join(__dirname, 'wallet'));
  const credPath = path.join(__dirname, '/wallet/msp');

  const certificate = fs.readFileSync(path.join(credPath, 'signcerts/cert.pem')).toString();
  const privateKey = fs.readFileSync(path.join(credPath, 'keystore', fs.readdirSync(path.join(credPath, 'keystore'))[0])).toString();
  const identityLabel = 'admin';

  const identity = {
    credentials: { certificate, privateKey },
    mspId: 'Org1MSP',   // Make sure this matches your org MSP
    type: 'X.509',
  };

  await wallet.put(identityLabel, identity);
  console.log('Admin identity imported into wallet');
}

importAdmin();
