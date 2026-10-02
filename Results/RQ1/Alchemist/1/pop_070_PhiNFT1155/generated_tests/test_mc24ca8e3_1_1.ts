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