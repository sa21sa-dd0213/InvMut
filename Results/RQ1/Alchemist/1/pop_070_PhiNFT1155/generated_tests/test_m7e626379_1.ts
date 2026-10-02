import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant kill test - ArtCreated event emission", function () {
  it("should emit ArtCreated event when createArtFromFactory is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 with constructor arguments
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required before calling createArtFromFactory)
    const credChainId = 1;
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDest = owner.address;
    
    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest);
    
    // Get the PhiFactory contract address from the initialized instance
    const phiFactoryAddress = await instance.phiFactoryContract();
    
    // We need to call createArtFromFactory via the PhiFactory (onlyPhiFactory modifier)
    // Since we can't easily get the actual PhiFactory, we'll simulate it by:
    // 1. Deploying a minimal contract that can call createArtFromFactory
    
    // Deploy a mock PhiFactory to call createArtFromFactory
    const MockPhiFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockPhiFactory.deploy(instance.target);
    await mockFactory.waitForDeployment();
    
    // Set the phiFactoryContract address in the NFT contract to our mock
    // Note: This requires owner privileges since onlyOwner can upgrade
    // We'll need to use the storage slot directly or deploy differently
    
    // Alternative approach: Deploy the contract with a pre-set PhiFactory
    // For this test, we'll use a direct call approach
    
    // First, let's check if we can call createArtFromFactory directly by impersonating the PhiFactory
    const artId = 1;
    
    // We need to call createArtFromFactory with msg.sender being the phiFactoryContract
    // This requires ethers to impersonate or use callStatic
    
    // Since the contract is upgradeable and has onlyPhiFactory modifier,
    // we'll create a simple test contract that acts as PhiFactory
    
    // Deploy a helper contract
    const HelperFactory = await ethers.getContractFactory("PhiFactoryHelper");
    const helper = await HelperFactory.deploy(instance.target);
    await helper.waitForDeployment();
    
    // Now we need to update the phiFactoryContract address
    // Since the contract is upgradeable and Ownable2Step, we can transfer ownership
    // But for simplicity, let's use a different approach
    
    // Actually, looking at the contract more carefully, the phiFactoryContract is set during initialize
    // and it's set to msg.sender (the deployer). So owner should be able to call it.
    
    // Let's check if we can call createArtFromFactory directly (it requires onlyPhiFactory)
    // The onlyPhiFactory modifier checks msg.sender == address(phiFactoryContract)
    // Since phiFactoryContract is set to msg.sender during initialize, and owner called initialize,
    // phiFactoryContract = owner.address
    
    // So owner should be able to call createArtFromFactory
    const artFee = await instance.phiFactoryContract().then(() => 0); // This might fail
    
    // Let's use a different approach - deploy a proper mock
    const artId2 = 2;
    
    // Try to call createArtFromFactory with owner (who is the phiFactoryContract)
    await expect(
      instance.connect(owner).createArtFromFactory(artId2, { value: ethers.parseEther("0.01") })
    ).to.emit(instance, "ArtCreated")
     .withArgs(artId2, 1); // tokenIdCounter starts at 1
    
    // Verify tokenIdCounter incremented
    expect(await instance.tokenIdCounter()).to.equal(2);
  });
});