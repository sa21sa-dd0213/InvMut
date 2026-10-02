import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant test - maa4fa10a", function () {
  it("should revert when non-artist/non-owner calls updateRoyalties", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDestination = owner.address;
    
    await instance.initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDestination
    );
    
    // Get the phiFactoryContract address
    const phiFactoryAddress = await instance.phiFactoryContract();
    
    // We need to create an art first to have a tokenId with an artist
    // First, let's set up the PhiFactory mock or use the actual factory
    // Since we need a real PhiFactory, let's deploy a simple mock
    const MockFactory = await ethers.getContractFactory("PhiFactoryMock");
    const mockFactory = await MockFactory.deploy(owner.address);
    await mockFactory.waitForDeployment();
    
    // Set the phiFactoryContract in the instance (this would normally be done during initialization)
    // We need to directly set it since the instance sets it to msg.sender during initialize
    // Let's redeploy and properly initialize
    const instance2 = await Factory.deploy();
    await instance2.waitForDeployment();
    
    // Override the phiFactoryContract by calling initialize with our mock
    // The initialize function sets phiFactoryContract = msg.sender
    // We need to deploy from the mock factory address or use a workaround
    // Let's use the signer to simulate the factory
    
    // For this test, we'll create a scenario where we have a token with an artist
    // Create an art via the factory (simulated)
    const artId = 1;
    const tokenId = 1;
    
    // Set up the art data in the mock factory
    await mockFactory.setArtData(artId, {
      credId: 1,
      credCreator: owner.address,
      credChainId: 1,
      verificationType: "SIGNATURE",
      uri: "https://example.com/token/1",
      artAddress: await instance2.getAddress(),
      tokenId: tokenId,
      artist: addr1.address, // addr1 is the artist
      receiver: addr1.address,
      royalties: { royaltyBPS: 500, royaltyRecipient: owner.address },
      maxSupply: 100,
      mintFee: ethers.parseEther("0.01"),
      startTime: 0,
      endTime: 0,
      numberMinted: 0,
      soulBounded: false
    });
    
    // Set the phiFactoryContract in the instance
    // We need to directly manipulate storage or use a different approach
    // Since the contract sets phiFactoryContract = msg.sender during initialize,
    // we need to deploy from the factory address
    
    // Alternative approach: Deploy a new instance and have the mock factory initialize it
    const instance3 = await Factory.deploy();
    await instance3.waitForDeployment();
    
    // Call initialize from the mock factory address
    await mockFactory.initializeContract(
      await instance3.getAddress(),
      credChainId,
      credId,
      verificationType,
      protocolFeeDestination
    );
    
    // Now set the art data and create the art
    await mockFactory.setArtData(artId, {
      credId: 1,
      credCreator: owner.address,
      credChainId: 1,
      verificationType: "SIGNATURE",
      uri: "https://example.com/token/1",
      artAddress: await instance3.getAddress(),
      tokenId: tokenId,
      artist: addr1.address,
      receiver: addr1.address,
      royalties: { royaltyBPS: 500, royaltyRecipient: owner.address },
      maxSupply: 100,
      mintFee: ethers.parseEther("0.01"),
      startTime: 0,
      endTime: 0,
      numberMinted: 0,
      soulBounded: false
    });
    
    // Create art from factory
    await mockFactory.createArtFromFactory(await instance3.getAddress(), artId, { value: ethers.parseEther("0.001") });
    
    // Now try to call updateRoyalties from addr2 (not the artist addr1, not the owner)
    const royaltyConfig = {
      royaltyBPS: 1000,
      royaltyRecipient: addr2.address
    };
    
    // This should revert with NotArtCreator error
    await expect(
      instance3.connect(addr2).updateRoyalties(tokenId, royaltyConfig)
    ).to.be.revertedWithCustomError(instance3, "NotArtCreator");
  });
});

// Mock PhiFactory contract for testing
// This would need to be a separate Solidity file
contract PhiFactoryMock {
  address public owner;
  mapping(uint256 => IPhiFactory.ArtData) public artData;
  uint256 public artCreateFee = ethers.parseEther("0.001");
  
  constructor(address _owner) {
    owner = _owner;
  }
  
  function setArtData(uint256 artId, IPhiFactory.ArtData memory data) external {
    artData[artId] = data;
  }
  
  function initializeContract(
    address contractAddress,
    uint256 credChainId,
    uint256 credId,
    string memory verificationType,
    address protocolFeeDestination
  ) external {
    IPhiNFT1155(contractAddress).initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDestination
    );
  }
  
  function createArtFromFactory(address nftContract, uint256 artId) external payable {
    IPhiNFT1155(nftContract).createArtFromFactory{value: msg.value}(artId);
  }
  
  function protocolFeeDestination() external view returns (address) {
    return owner;
  }
  
  function phiRewardsAddress() external view returns (address) {
    return address(0);
  }
  
  function getTokenURI(uint256 artId) external view returns (string memory) {
    return artData[artId].uri;
  }
  
  function contractURI(address) external view returns (string memory) {
    return "https://example.com/contract";
  }
  
  function artData(uint256 artId) external view returns (IPhiFactory.ArtData memory) {
    return artData[artId];
  }
}