// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract PublicSale is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Mi Primer Token
    IERC20Upgradeable public miPrimerToken;

    // 17 de Junio del 2023 GMT
    uint256 constant startDate = 1686960000;

    // Maximo price NFT
    uint256 constant MAX_PRICE_NFT = 50000 * 10 ** 18;

    // Gnosis Safe
    // Crear su setter
    address public gnosisSafeWallet;

    mapping(uint256 => bool) public nftSold;

    event DeliverNft(address winnerAccount, uint256 nftId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function setTokenAddress(address _tokenAddress) 
    external onlyRole(DEFAULT_ADMIN_ROLE) {
        miPrimerToken = IERC20Upgradeable(_tokenAddress);
    }

    function setGnosisSafeWallet(address _gnosisSafeWallet) 
    external onlyRole(DEFAULT_ADMIN_ROLE) {
        gnosisSafeWallet = _gnosisSafeWallet;
    }

    function purchaseNftById(uint256 _id) external {
        uint nftPrice = _getPriceById(_id, (block.timestamp - startDate) / 3600);
        // 1 - el id no se haya vendido. Sugerencia: llevar la cuenta de ids vendidos
        require(!nftSold[_id], "Public Sale: id not available");
        // 2 - el msg.sender haya dado allowance a este contrato en suficiente de MPRTKN
        require(miPrimerToken.allowance(msg.sender, address(this)) > 0, "Public Sale: Not enough allowance");
        // 3 - el msg.sender tenga el balance suficiente de MPRTKN
        require(miPrimerToken.allowance(msg.sender, address(this)) >= nftPrice, "Public Sale: Not enough token balance");
        // 4 - el _id se encuentre entre 1 y 30
        require(_id > 0 && _id <= 30, "Public Sale: NFT id out of range");
        // Purchase fees: 10% para Gnosis Safe (fee)
        uint fee = nftPrice / 10;

        miPrimerToken.transferFrom(msg.sender, gnosisSafeWallet, fee);
        // 90% se quedan en este contrato (net)
        miPrimerToken.transferFrom(msg.sender, address(this), nftPrice - fee);
        // NFT vendido
        nftSold[_id] = true;
        // EMITIR EVENTO para que lo escuche OPEN ZEPPELIN DEFENDER
        emit DeliverNft(msg.sender, _id);
    }

    function depositEthForARandomNft() public payable {
        uint256 nftId = _getRandomNftId();
        // 1 - que el msg.value sea mayor o igual a 0.01 ether
        require(msg.value >= 0.01 ether, "Public Sale: Not enough ether");
        // 2 - que haya NFTs disponibles para hacer el random
        require(!nftSold[nftId], "Public Sale: No NFTs available");
        // Escoger una id random de la lista de ids disponibles

        // Enviar ether a Gnosis Safe
        // SUGERENCIA: Usar gnosisSafeWallet.call para enviar el ether
        // Validar los valores de retorno de 'call' para saber si se envio el ether correctamente
        bool success = payable(gnosisSafeWallet).send(msg.value);

        require(success, "Public Sale: Failed to send ether");
        // Dar el cambio al usuario
        // El vuelto seria equivalente a: msg.value - 0.01 ether
        if (msg.value > 0.01 ether) {
            // logica para dar cambio
            // usar '.transfer' para enviar ether de vuelta al usuario
            payable(msg.sender).transfer(msg.value - 0.01 ether);
        }

        // EMITIR EVENTO para que lo escuche OPEN ZEPPELIN DEFENDER
        emit DeliverNft(msg.sender, nftId);
    }

    // Crear el metodo receive
    receive() external payable {
        depositEthForARandomNft();
    }

    ////////////////////////////////////////////////////////////////////////
    /////////                    Helper Methods                    /////////
    ////////////////////////////////////////////////////////////////////////

    // Devuelve un id random de NFT de una lista de ids disponibles
    function _getRandomNftId() internal view returns (uint256) {
        uint[] memory availableNfts = new uint[](30);
        uint counter = 0;

        for (uint i = 1; i <= 30; i++) {
            if (!nftSold[i]) {
                availableNfts[counter] = i;

                counter = (i == 30) ? counter : counter + 1;
            }
        }

        bytes32 str = keccak256(abi.encodePacked(block.timestamp, msg.sender));
        uint nftId = (uint256(str) % counter) + 1;

        return availableNfts[nftId];
    }

    // Según el id del NFT, devuelve el precio. Existen 3 grupos de precios
    function _getPriceById(uint256 _id, uint totalHours) internal pure returns (uint256) {
        uint thousandTokens = 1000 * 10 ** 18;
        uint256 priceGroupOne = thousandTokens / 2;
        uint256 priceGroupTwo = thousandTokens * _id;
        uint256 priceGroupThree = (thousandTokens * 10) + (totalHours * thousandTokens);

        if (_id > 0 && _id <= 10) {
            return priceGroupOne;
        } else if (_id > 10 && _id <= 20) {
            return priceGroupTwo;
        } else if (_id > 20 && _id <= 30) {
            return (priceGroupThree > MAX_PRICE_NFT) ? MAX_PRICE_NFT : priceGroupThree;
        } else {
            return 0;
        }
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
