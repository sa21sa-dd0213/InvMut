import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - onlyArtCreator modifier test", function () {
  it("should allow the owner to call updateRoyalties, but the mutant should revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract with required parameters
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
    
    // First, we need to create an art through the factory to have a tokenId
    // Since we're testing the onlyArtCreator modifier, we need to understand the flow:
    // The onlyArtCreator modifier checks if msg.sender is the artist or the owner
    // We need to simulate the factory creating art first
    
    // Get the phiFactoryContract address (it's set to msg.sender during initialize)
    // For testing, we'll directly test the modifier logic by calling updateRoyalties
    // on a token that exists
    
    // Create a simple RoyaltyConfiguration
    const royaltyConfig = {
      royaltyBPS: 500,
      royaltyRecipient: owner.address
    };
    
    // The owner should be able to call updateRoyalties since they are the owner
    // In the mutant, msg.sender >= owner() would revert for the owner
    // because the owner's address is >= itself
    await expect(
      instance.connect(owner).updateRoyalties(1, royaltyConfig)
    ).to.not.be.reverted;
    
    // Additionally, verify that a non-owner, non-artist address is still rejected
    await expect(
      instance.connect(addr1).updateRoyalties(1, royaltyConfig)
    ).to.be.revertedWithCustomError(instance, "NotArtCreator");
  });
});