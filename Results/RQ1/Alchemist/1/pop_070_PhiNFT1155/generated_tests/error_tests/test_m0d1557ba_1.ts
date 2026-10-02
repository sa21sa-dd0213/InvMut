import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - kill mutant m0d1557ba (onlyArtCreator modifier)", function () {
  it("should revert when unauthorized address calls updateRoyalties on original contract", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    await instance.initialize(credChainId, credId, verificationType, owner.address);
    
    // We need to create an art first through the factory to have a token with an art creator
    // Since we can't easily mock the factory, we'll directly test the updateRoyalties function
    // by attempting to call it from an unauthorized address
    
    // Create a RoyaltyConfiguration
    const royaltyConfig = {
      royaltyBPS: 500,
      royaltyRecipient: addr1.address
    };
    
    // Attempt to call updateRoyalties from an unauthorized address (addr2)
    // This should revert with NotArtCreator because addr2 is neither the artist nor the owner
    await expect(
      instance.connect(addr2).updateRoyalties(1, royaltyConfig)
    ).to.be.revertedWithCustomError(instance, "NotArtCreator");
  });
});