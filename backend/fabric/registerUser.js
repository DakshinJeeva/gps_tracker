const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const caURL = "https://localhost:7054";
const caCertPath = "/home/dakshin-jeeva/Projects/gps_tracker/crypto/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem";

async function registerUser(email) {
  try {
    console.log("➡️ Starting registerUser for:", email);

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
    const existing = await wallet.get(email);
    if (existing) {
      console.log("ℹ️ User already exists in wallet:", email);
      return existing.enrollmentSecret || email + "_secret";
    }

    // 4️⃣ Get admin identity
    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) throw new Error("❌ Admin not enrolled! Enroll admin first.");
    console.log("✅ Admin identity found");

    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    // 5️⃣ Register user with CA
    const secret = await ca.register({
      enrollmentID: email,
      role: 'client'
    }, adminUser);
    console.log("✅ User registered with CA. Secret:", secret);

    return secret;
  } catch (err) {
    console.error("❌ registerUser error:", err);
    throw err;
  }
}

module.exports = registerUser;
