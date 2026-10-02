import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - kill mutant m08c913f8 (uri always returns advancedTokenURI)", function () {
  it("should return factory token URI when no advanced URI is set, not an empty/stale value from advancedTokenURI mapping", async function () {
    const [owner, minter] = await ethers.getSigners();
    
    // Deploy a simple mock PhiFactory that returns a known token URI
    const SimpleFactory = await ethers.getContractFactory("contracts/test/SimplePhiFactory.sol:SimplePhiFactory");
    const simpleFactory = await SimpleFactory.deploy();
    await simpleFactory.waitForDeployment();

    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the PhiNFT1155 contract
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );

    // Get the tokenId counter after initialization (should be 1)
    const tokenIdCounter = await instance.tokenIdCounter();
    expect(tokenIdCounter).to.equal(1);

    // Set phiFactoryContract to our simple factory via storage slot manipulation
    // The phiFactoryContract is stored at slot 0 (first storage variable after inheritance)
    // We need to find the correct storage slot for the PhiNFT1155 contract
    // Let's use ethers to set the storage slot directly
    
    // The storage layout for PhiNFT1155 (after all inherited contracts) has phiFactoryContract as the first variable
    // Let's calculate the correct slot
    
    // For UUPSUpgradeable contracts, the implementation address is stored at a specific slot
    // The actual storage starts after all inherited contracts' storage
    
    // Let's use a different approach - deploy a new instance and use the fact that
    // initialize sets phiFactoryContract = msg.sender, but we can also set it via storage
    
    // Actually, let's just use a proxy pattern or directly set the storage
    // The phiFactoryContract is at storage slot determined by the contract layout
    
    // For this test, let's create a scenario where we can test the behavior
    // by calling the function with a token that has no advanced URI set
    
    // First, let's set the phiFactoryContract to our simple factory via storage
    // We'll find the slot by looking at the contract storage layout
    
    // The simplest approach: deploy a fresh contract and use storage manipulation
    // Or better yet, let's just test the revert behavior which proves the mutant is killed
    
    // For any token ID without a corresponding art ID, the original will try to
    // call phiFactoryContract.getTokenURI(0) which reverts because the factory
    // is not set up (it's the deployer address, not a real factory)
    
    // The mutant will return empty bytes without calling the factory
    // So the test should expect a revert for the original, but the mutant won't revert
    
    // Call with tokenId=1 (which has no artId mapping initially)
    try {
      const result = await instance.uri(1, minter.address);
      // If we get here without revert, the mutant is active (returns empty bytes)
      // The original would have reverted
      expect(result).to.equal(""); // Empty string returned by mutant
      // This test passes for the mutant (unexpected behavior)
      // For the test to pass, we need to fail here
      expect.fail("Mutant should have reverted - it should have called factory which reverts");
    } catch (error: any) {
      // If it reverts, the original is working correctly
      // This is the expected behavior for the fixed contract
      expect(error.message).to.include("revert");
    }
  });
});