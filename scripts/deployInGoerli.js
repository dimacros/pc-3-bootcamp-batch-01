require("dotenv").config();

const {
  getRole,
  verify,
  ex,
  printAddress,
  deploySC,
  deploySCNoUp,
} = require("../utils");

var MINTER_ROLE = getRole("MINTER_ROLE");
var BURNER_ROLE = getRole("BURNER_ROLE");

async function deployUSDC() {
  const usdc = await deploySCNoUp("USDCoin", []);

  await verify(usdc.address, "USDCoin", []);

  return usdc;
}

async function deployMiPrimerToken() {
  const miPrimerToken = await deploySC("MiPrimerToken", []);
  const miPrimerTknImplAddress = await printAddress("MiPrimerToken", miPrimerToken.address);
  
  await verify(miPrimerTknImplAddress, "MiPrimerToken", []);

  return miPrimerToken;
}

async function deployPublicSale(miPrimerTokenAddress) {
  // gnosis safe
  // Crear un gnosis safe en https://gnosis-safe.io/app/
  // Extraer el address del gnosis safe y pasarlo al contrato con un setter
  var gnosis = { address: "0xC18c2452c4072efc2ECA82bE98ae5A10966d1ce2" };

  const publicSale = await deploySC("PublicSale", []);
  const publicSaleImplAddress = await printAddress("PublicSale", publicSale.address);

  await Promise.all([
    ex(publicSale, "setTokenAddress", [miPrimerTokenAddress], "setTokenAddress failed"),
    ex(publicSale, "setGnosisSafeWallet", [gnosis.address], "setGnosisSafeWallet failed"),
  ]);

  await printAddress("PublicSale", publicSale.address);
  await verify(publicSaleImplAddress, "PublicSale", []);
}

async function deployGoerli() {
  const miPrimerToken = await deployMiPrimerToken();

  await deployPublicSale(miPrimerToken.address);
  await deployUSDC();
}

deployGoerli().catch(console.error)
