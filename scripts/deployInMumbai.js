require("dotenv").config();

const {
  getRole,
  verify,
  ex,
  deploySCNoUp,
} = require("../utils");

var MINTER_ROLE = getRole("MINTER_ROLE");

async function deployMumbai() {
  var relayerAddress = "0xa557C4f8400BB6d4bF87aE091E2181012a3D5D2f";
  var name = "Mi Primer NFT";
  var symbol = "MPRNFT";
  var nftContract = await deploySCNoUp("MiPrimerNft", [name, symbol]);

  // set up
  await ex(nftContract, "grantRole", [MINTER_ROLE, relayerAddress], "GR");
  await verify(nftContract.address, "MiPrimerNft", [name, symbol]);
}

deployMumbai().catch(console.error)
