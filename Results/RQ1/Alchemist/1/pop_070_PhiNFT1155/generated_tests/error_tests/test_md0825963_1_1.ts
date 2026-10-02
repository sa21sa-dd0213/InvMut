import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant md0825963 - onlyPhiFactory modifier", function () {
  it("should kill mutant by calling createArtFromFactory from the PhiFactory contract and expecting success (mutant reverts when it should not)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy PhiNFT1155
    const PhiNFT1155Factory = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155 = await PhiNFT1155Factory.deploy();
    await phiNFT1155.waitForDeployment();

    // Initialize PhiNFT1155 - this sets phiFactoryContract to msg.sender (owner)
    // But we need a mock PhiFactory to get protocolFeeDestination and other data
    // So first deploy a mock factory, then deploy and initialize PhiNFT1155 properly
    
    // Deploy a minimal mock PhiFactory contract
    const mockFactoryCode = `pragma solidity ^0.8.0;
      contract MockPhiFactory {
          address public protocolFeeDestination;
          uint256 public artCreateFee = 0.001 ether;
          address public phiRewardsAddress;
          
          function setProtocolFeeDestination(address dest) external {
              protocolFeeDestination = dest;
          }
          
          function setPhiRewardsAddress(address addr) external {
              phiRewardsAddress = addr;
          }
          
          function artData(uint256) external view returns (
              address artist,
              address receiver,
              uint256 credChainId,
              string memory verificationType,
              string memory uri,
              address artAddress,
              uint256 tokenId,
              address artist2,
              address receiver2,
              uint256 maxSupply,
              uint256 mintFee,
              uint256 startTime,
              uint256 endTime,
              uint256 numberMinted,
              bool soulBounded
          ) {
              return (address(0), address(0), 0, "", "", address(0), 0, address(0), address(0), 0, 0, 0, 0, 0, false);
          }
          
          function contractURI(address) external view returns (string memory) {
              return "";
          }
          
          function getTokenURI(uint256) external view returns (string memory) {
              return "";
          }
          
          receive() external payable {}
      }`;

    const MockFactory = await ethers.getContractFactory(mockFactoryCode);
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Set protocol fee destination
    await mockFactory.setProtocolFeeDestination(owner.address);
    
    // Now deploy the PhiNFT1155 that will be initialized with mockFactory as phiFactoryContract
    // We need to deploy a new instance and have the mockFactory call initialize
    // But since initialize sets phiFactoryContract = msg.sender, we need to call from mockFactory
    const PhiNFT1155Factory2 = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155_2 = await PhiNFT1155Factory2.deploy();
    await phiNFT1155_2.waitForDeployment();
    
    // Have mockFactory call initialize on phiNFT1155_2
    // This requires the mockFactory to have a function that calls initialize
    const factoryWithInitCode = `pragma solidity ^0.8.0;
      interface IPhiNFT1155 {
          function initialize(uint256 credChainId, uint256 credId, string memory verificationType, address protocolFeeDestination) external;
      }
      
      contract MockFactoryWithInit {
          address public protocolFeeDestination;
          uint256 public artCreateFee = 0.001 ether;
          
          function setProtocolFeeDestination(address dest) external {
              protocolFeeDestination = dest;
          }
          
          function initNFT(address nft, uint256 credChainId, uint256 credId, string memory verificationType) external {
              IPhiNFT1155(nft).initialize(credChainId, credId, verificationType, protocolFeeDestination);
          }
          
          function artData(uint256) external view returns (
              address artist,
              address receiver,
              uint256 credChainId,
              string memory verificationType,
              string memory uri,
              address artAddress,
              uint256 tokenId,
              address artist2,
              address receiver2,
              uint256 maxSupply,
              uint256 mintFee,
              uint256 startTime,
              uint256 endTime,
              uint256 numberMinted,
              bool soulBounded
          ) {
              return (address(0), address(0), 0, "", "", address(0), 0, address(0), address(0), 0, 0, 0, 0, 0, false);
          }
          
          function contractURI(address) external view returns (string memory) {
              return "";
          }
          
          function getTokenURI(uint256) external view returns (string memory) {
              return "";
          }
          
          receive() external payable {}
      }`;
    
    const MockFactoryWithInit = await ethers.getContractFactory(factoryWithInitCode);
    const factoryWithInit = await MockFactoryWithInit.deploy();
    await factoryWithInit.waitForDeployment();
    
    await factoryWithInit.setProtocolFeeDestination(owner.address);
    await factoryWithInit.initNFT(phiNFT1155_2.target, 1, 1, "test");
    
    // Now phiNFT1155_2 has phiFactoryContract = factoryWithInit address
    // Test: call createArtFromFactory from the phiFactoryContract - should succeed in original
    // but revert in mutant
    
    // We need to send ETH to cover the artCreateFee
    await expect(
      factoryWithInit.sendTransaction({
        to: phiNFT1155_2.target,
        data: ethers.hexlify(ethers.toUtf8Bytes("createArtFromFactory(uint256)")).slice(0, 10) + 
              ethers.zeroPadValue(ethers.toBeHex(1), 32).slice(2),
        value: ethers.parseEther("0.002")
      })
    ).to.not.be.reverted;

    // Additional assertion to ensure the function actually executed
    const tokenId = await phiNFT1155_2.tokenIdCounter();
    expect(tokenId).to.be.gt(1);
  });
});