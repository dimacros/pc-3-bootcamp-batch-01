const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const { getRole, deploySC, deploySCNoUp, ex, pEth } = require("../utils");

const MINTER_ROLE = getRole("MINTER_ROLE");
const BURNER_ROLE = getRole("BURNER_ROLE");

// 17 de Junio del 2023 GMT
var startDate = 1686960000;

var makeBN = (num) => ethers.BigNumber.from(String(num));

describe("MI PRIMER TOKEN TESTING", function () {
  var nftContract, publicSale, miPrimerToken, usdc;
  var owner, gnosis, alice, bob, carl, deysi;
  var name = "MiPrimerNft";
  var symbol = "MPRNFT";

  before(async () => {
    [owner, gnosis, alice, bob, carl, deysi] = await ethers.getSigners();
  });

  // Estos dos métodos a continuación publican los contratos en cada red
  // Se usan en distintos tests de manera independiente
  // Ver ejemplo de como instanciar los contratos en deploy.js
  async function deployNftSC() {
    nftContract = await deploySCNoUp("MiPrimerNft", [name, symbol]);
  }

  async function deployPublicSaleSC() {
    publicSale = await deploySC("PublicSale");
    miPrimerToken = await deploySC("MiPrimerToken");
  }

  describe("Mi Primer Nft Smart Contract", () => {
    // Se publica el contrato antes de cada test
    beforeEach(async () => {
      await deployNftSC();
    });

    it("Verifica nombre colección", async () => {
      expect(nftContract.name()).to.eventually.equal(name);
    });

    it("Verifica símbolo de colección", async () => {
      expect(nftContract.symbol()).to.eventually.equal(symbol);
    });

    it("No permite acuñar sin privilegio", async () => {
      const err = 'AccessControl: account [a-z0-9]* is missing role [a-z0-9]*';

      expect(nftContract.connect(alice).safeMint(alice.address, 1))
        .to.eventually.revertedWith(new RegExp(err));
    });

    it("No permite acuñar doble id de Nft", async () => {
      await nftContract.connect(owner).safeMint(alice.address, 1);

      expect(nftContract.connect(owner).safeMint(alice.address, 1))
        .to.eventually.revertedWith("ERC721: token already minted");
    });

    it("Verifica rango de Nft: [1, 30]", async () => {
      // Mensaje error: "NFT: Token id out of range"
      expect(nftContract.connect(owner).safeMint(bob.address, 31))
        .to.eventually.revertedWith("NFT: Token id out of range");
    });

    it("Se pueden acuñar todos (30) los Nfts", async () => {
      for (let i = 1; i <= 30; i++) {
        await nftContract.connect(owner).safeMint(bob.address, i);

        expect(nftContract.connect(bob).ownerOf(i))
          .to.eventually.equal(bob.address);
      }
    });
  });

  describe("Public Sale Smart Contract", () => {
    // Se publica el contrato antes de cada test
    beforeEach(async () => {
      await deployPublicSaleSC();
      await publicSale.setTokenAddress(miPrimerToken.address);
      await publicSale.setGnosisSafeWallet(gnosis.address);
    });

    it("No se puede comprar otra vez el mismo ID", async () => {
      await miPrimerToken.approve(publicSale.address, pEth("1000"));
      await publicSale.purchaseNftById(1);

      expect(publicSale.purchaseNftById(1))
        .to.eventually.revertedWith("Public Sale: id not available");
    });

    it("IDs aceptables: [1, 30]", async () => {
      await miPrimerToken.approve(publicSale.address, pEth("1000"));

      expect(publicSale.purchaseNftById(31))
        .to.eventually.revertedWith("Public Sale: NFT id out of range");
    });

    it("Usuario no dio permiso de MiPrimerToken a Public Sale", async () => {

      expect(publicSale.purchaseNftById(1))
        .to.eventually.revertedWith("Public Sale: Not enough allowance");
    });

    it("Usuario no tiene suficientes MiPrimerToken para comprar", async () => {
      await miPrimerToken.approve(publicSale.address, pEth("100"));

      expect(publicSale.purchaseNftById(1))
        .to.eventually.revertedWith("Public Sale: Not enough token balance");
    });

    describe("Compra grupo 1 de NFT: 1 - 10", () => {
      it("Emite evento luego de comprar", async () => {
        await miPrimerToken.approve(publicSale.address, pEth("10000"));

        for (let i = 1; i <= 10; i++) {
          expect(publicSale.purchaseNftById(i))
            .to.eventually.emit(publicSale, "DeliverNft")
            .withArgs(owner.address, i);
        }
      });

      it("Disminuye balance de MiPrimerToken luego de compra", async () => {
        // Usar changeTokenBalance
        // source: https://ethereum-waffle.readthedocs.io/en/latest/matchers.html#change-token-balance
        await miPrimerToken.approve(publicSale.address, pEth("1000"));

        expect(publicSale.purchaseNftById(1))
          .to.eventually.changeTokenBalance(miPrimerToken, owner, pEth("-500"));

      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {
        await miPrimerToken.approve(publicSale.address, pEth("1000"));

        expect(publicSale.purchaseNftById(1))
          .to.eventually.changeTokenBalance(miPrimerToken, gnosis, pEth("50"));
      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        await miPrimerToken.approve(publicSale.address, pEth("1000"));

        expect(publicSale.purchaseNftById(1))
          .to.eventually.changeTokenBalance(miPrimerToken, publicSale, pEth("450"));
      });
    });

    describe("Compra grupo 2 de NFT: 11 - 20", () => {
      it("Emite evento luego de comprar", async () => {
        await miPrimerToken.approve(publicSale.address, pEth("10000"));

        for (let i = 11; i <= 20; i++) {
          expect(publicSale.purchaseNftById(i))
            .to.eventually.emit(publicSale, "DeliverNft")
            .withArgs(owner.address, i);
        }
      });

      it("Disminuye balance de MiPrimerToken luego de compra", async () => {
        await miPrimerToken.approve(publicSale.address, pEth("11000"));

        expect(publicSale.purchaseNftById(11))
          .to.eventually.changeTokenBalance(miPrimerToken, owner, pEth("-11000"));
      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {
        await miPrimerToken.approve(publicSale.address, pEth("11000"));

        expect(publicSale.purchaseNftById(11))
          .to.eventually.changeTokenBalance(miPrimerToken, gnosis, pEth("1100"));
      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        await miPrimerToken.approve(publicSale.address, pEth("11000"));

        expect(publicSale.purchaseNftById(11))
          .to.eventually.changeTokenBalance(miPrimerToken, publicSale, pEth("9900"));
      });
    });

    describe("Compra grupo 3 de NFT: 21 - 30", () => {
      it("Disminuye balance de MiPrimerToken luego de compra", async () => {
        await miPrimerToken.approve(publicSale.address, pEth("10000"));

        for (let i = 21; i <= 30; i++) {
          expect(publicSale.purchaseNftById(i))
            .to.eventually.emit(publicSale, "DeliverNft")
            .withArgs(owner.address, i);
        }
      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {
        await miPrimerToken.approve(publicSale.address, pEth("10000"));

        expect(publicSale.purchaseNftById(21))
          .to.eventually.changeTokenBalance(miPrimerToken, gnosis, pEth("1000"));
      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        await miPrimerToken.approve(publicSale.address, pEth("11000"));

        expect(publicSale.purchaseNftById(21))
          .to.eventually.changeTokenBalance(miPrimerToken, gnosis, pEth("9000"));
      });
    });

    describe("Depositando Ether para Random NFT", () => {
      it("Envío de Ether y emite Evento (30 veces)", async () => {
        for (let i = 1; i <= 30; i++) {
          const tx = owner.sendTransaction({ 
            to: publicSale.address, 
            value: pEth("0.01")
          });

          expect(tx)
            .to.eventually.emit(publicSale, "DeliverNft")
            .withArgs(owner.address, i);
        }
      });

      it("Envío de Ether y Método falla la vez 31", async () => {
        it.only("Método emite evento (30 veces) ", async () => {
          for (let i = 1; i <= 30; i++) {
            await owner.sendTransaction({ 
              to: publicSale.address, 
              value: pEth("0.01")
            });
          }

          const tx = owner.sendTransaction({ 
            to: publicSale.address, 
            value: pEth("0.01")
          });

          expect(tx).to.eventually.revertedWith("Public Sale: No NFTs available");
        });
      });

      it("Da vuelto cuando y gnosis recibe Ether", async () => {
        // Usar el método changeEtherBalances
        // Source: https://ethereum-waffle.readthedocs.io/en/latest/matchers.html#change-ether-balance-multiple-accounts
        const tx = owner.sendTransaction({
          to: publicSale.address,
          value: pEth("0.02"),
        })

        expect(tx).to.eventually.changeEtherBalances(
          [owner.address, gnosis.address],
          [pEth("-0.01"), pEth("0.01")]
        );
      });
    });
  });
});
