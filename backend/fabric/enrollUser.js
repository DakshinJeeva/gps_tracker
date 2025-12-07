const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const caURL = "https://localhost:7054";
const caCertPath = "/home/dakshin-jeeva/Projects/gps_tracker/crypto/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem";

async function enrollUser(email, secret) {
  try {
    console.log("➡️ Starting enrollUser for:", email);

    // 1️⃣ Initialize CA client
    const ca = new FabricCAServices(
      caURL,
      { trustedRoots: fs.readFileSync(caCertPath), verify: true },
      "ca-org1"
    );
    console.log("✅ CA client initialized");

    // 2️⃣ Load wallet
    const walletPath = path.join(__dirname, '../wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log("✅ Wallet loaded at:", walletPath);

    // 3️⃣ Check if user already exists in wallet
    const userIdentity = await wallet.get(email);
    if (userIdentity) {
      console.log("ℹ️ User already exists in wallet:", email);
      return userIdentity;
    }

    // 4️⃣ Check admin identity
    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      throw new Error("❌ Admin identity not found in wallet! Please enroll admin first.");
    }
    console.log("✅ Admin identity found:", adminIdentity);

    // 5️⃣ Enroll user using secret
    const enrollment = await ca.enroll({
      enrollmentID: email,
      enrollmentSecret: secret,
    });
    console.log("✅ Enrollment successful for user:", email);

    // 6️⃣ Create identity object
    const identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: "Org1MSP",
      type: "X.509",
    };

    // 7️⃣ Put identity into wallet
    await wallet.put(email, identity);
    console.log("✅ Identity stored in wallet:", email);

    return identity;
  } catch (err) {
    console.error("❌ enrollUser error:", err);
    throw err;
  }
}

module.exports = enrollUser;
