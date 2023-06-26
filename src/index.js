import { BigNumber, Contract, providers, ethers, utils } from "ethers";

import usdcTknAbi from "../artifacts/contracts/USDCoin.sol/USDCoin.json";
import miPrimerTknAbi from "../artifacts/contracts/MiPrimerToken.sol/MiPrimerToken.json";
import publicSaleAbi from "../artifacts/contracts/PublicSale.sol/PublicSale.json";
import nftTknAbi from "../artifacts/contracts/NFT.sol/MiPrimerNft.json";

window.ethers = ethers;

var provider, signer, account;
var usdcTkContract, miPrTokenContract, nftTknContract, pubSContract;

function initSCsGoerli() {
  provider = new providers.Web3Provider(window.ethereum);

  const usdcAddress = '0xdA5651b3afe02012Ff163BbDa850AC3870C6bCDF';
  const miPrTknAddress = '0xe3bfD0aB9319611b4117d58F6fb4bD01f839835b';
  const pubSContractAddress = '0xcAae2aa95D93562D7F076Ad8C1E54EdAc06eb93c';

  usdcTkContract = new Contract(usdcAddress, usdcTknAbi.abi, provider);
  miPrTokenContract = new Contract(miPrTknAddress, miPrimerTknAbi.abi, provider);
  pubSContract = new Contract(pubSContractAddress, publicSaleAbi.abi, provider);
}

// OPTIONAL
// No require conexion con Metamask
// Usar JSON-RPC
// Se pueden escuchar eventos de los contratos usando el provider con RPC
function initSCsMumbai() {
  const nftAddress = '0x8571cFCeBd8d3EB21B0399581dcDc44F1af3f95F';
  const url = 'https://polygon-mumbai.g.alchemy.com/v2/7e2GQY8_YTN-jpnF0UsYUsD75IKwmt-G';

  nftTknContract = new Contract(
    nftAddress, 
    nftTknAbi.abi,
    new providers.JsonRpcProvider(url)
  );
}

function setUpListeners() {
  // Connect to Metamask
  const connectBtn = document.getElementById("connect");

  connectBtn.addEventListener("click", async () => {
    try {
      await window.ethereum.enable();
      provider = new providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
      account = await signer.getAddress();
      
      document.getElementById("walletStatus").innerHTML = 'Connected: ' + account;
    } catch (e) {
      console.log(e);
    }
  });

  // Change network to Mumbai
  const switchBtn = document.getElementById("switch");

  // Get USDC balance
  const usdcBalanceBtn = document.getElementById("usdcUpdate");

  usdcBalanceBtn.addEventListener("click", async () => {
    const balance = await usdcTkContract.balanceOf(account);
    const amount = BigNumber.from(balance).div(BigNumber.from(10).pow(6));

    document.getElementById("usdcBalance").innerHTML = amount.toString();
  });
  // Get MiPrimerToken balance
  const miPrimerTknBalanceBtn = document.getElementById("miPrimerTknUpdate");
  miPrimerTknBalanceBtn.addEventListener("click", async () => {
    const balance = await miPrTokenContract.balanceOf(account);
    const amount = BigNumber.from(balance).div(BigNumber.from(10).pow(18));

    document.getElementById("miPrimerTknBalance").innerHTML = amount.toString();
  });

  // Approve MiPrimerToken to PublicSale
  const approveBtn = document.getElementById("approveButton");
  
  approveBtn.addEventListener("click", async () => {
    const amount = document.getElementById("approveInput").value;
    const amountWei = utils.parseEther(amount === '' ? '0' : amount);

    if (amountWei.gt(await miPrTokenContract.balanceOf(account))) {
      document.getElementById("approveError").innerHTML = "Not enough balance";
      return;
    }

    try {
      const tx = await miPrTokenContract.connect(signer)
                        .approve(pubSContract.address, amountWei);

      const response = await tx.wait();

      console.log('Transaction:', response.transactionHash);
    } catch (e) {
      document.getElementById("approveError").innerHTML = e.message;
    }
  });

  // Buy an NFT with MiPrimerToken
  const buyNFTBtn = document.getElementById("purchaseButton");

  buyNFTBtn.addEventListener("click", async () => {
    const nftId = parseInt(document.getElementById("purchaseInput").value);
    
    if (isNaN(nftId) || nftId <= 0 || nftId > 30) {
      document.getElementById("purchaseError").innerHTML = "Invalid NFT ID";
      return;
    }

    try {
      const tx = await pubSContract.connect(signer)
                        .purchaseNftById(nftId);

      const response = await tx.wait();

      console.log('Transaction:', response.transactionHash);
    } catch (e) {
      document.getElementById("purchaseError").innerHTML = e.message;
    }
  });
  // Buy an NFT with ether
  const buyNFTWithEtherBtn = document.getElementById("purchaseEthButton");
  
  buyNFTWithEtherBtn.addEventListener("click", async () => {
    try {
      const tx = await pubSContract.connect(signer)
                        .depositEthForARandomNft({ 
                          gasLimit: ethers.utils.hexlify(1500000),
                          value: utils.parseEther('0.01') 
                        });

      const response = await tx.wait();

      console.log('Transaction:', response.transactionHash);
    } catch (e) {
      document.getElementById("purchaseEthError").innerHTML = e.message;
    }
  });

  // Send ether to PublicSale
  const sendEtherBtn = document.getElementById("sendEtherButton");

  sendEtherBtn.addEventListener("click", async () => {
    try {
      const payload = {
        to: pubSContract.address,
        gasLimit: ethers.utils.hexlify(1500000),
        value: utils.parseEther('0.01'),
      };

      const tx = await signer.sendTransaction(payload);

      const response = await tx.wait();

      console.log('Transaction:', response.transactionHash);
    } catch (e) {
      document.getElementById("sendEtherError").innerHTML = e.message;
    }
  });
}

function setUpEventsContracts() {
  const list = document.getElementById("nftList");

  nftTknContract.on("Transfer", (from, to, tokenId) => {
    list.innerHTML += `<li>Transfer from: ${from} to ${to} | Token ID: ${tokenId}</li>`;
  });
}

async function setUp() {
  initSCsGoerli();
  initSCsMumbai();
  setUpListeners();
  setUpEventsContracts();
}

setUp()
  .then()
  .catch((e) => console.log(e));
