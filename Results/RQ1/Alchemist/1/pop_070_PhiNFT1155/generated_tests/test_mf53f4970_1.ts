import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant mf53f4970 test", function () {
  it("should allow owner to call onlyArtCreator functions", async function () {
    const [owner, artist] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const PhiNFT1155 = await ethers.getContractFactory("PhiNFT1155");
    const instance = await PhiNFT1155.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    await instance.initialize(credChainId, credId, verificationType, owner.address);
    
    // Create an art through the factory (simplified - we need a mock factory)
    // Since we need the phiFactoryContract to be set, we can't easily test updateRoyalties
    // Instead, let's test by deploying a mock PhiFactory
    
    // Deploy a minimal mock factory that returns artist data
    const MockFactory = await ethers.getContractFactory("contracts/test/MockPhiFactory.sol:MockPhiFactory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Set up art data with artist as the artist
    const tokenId = 1;
    const artId = 1;
    await mockFactory.setArtData(artId, artist.address, owner.address);
    
    // We need to set the phiFactoryContract - but it's set during initialize
    // Let's create a fresh contract that we can properly configure
    
    // Actually, let's take a different approach - test the modifier logic directly
    // The modifier checks msg.sender against artist and owner
    
    // Create a test contract that exposes the modifier logic
    const TestModifier = await ethers.getContractFactory("contracts/test/TestOnlyArtCreator.sol:TestOnlyArtCreator");
    const testModifier = await TestModifier.deploy();
    await testModifier.waitForDeployment();
    
    // Initialize with owner as protocolFeeDest and artist
    await testModifier.initialize(1, 1, "TEST", owner.address);
    
    // Set artist address in the test contract
    await testModifier.setArtist(artist.address);
    
    // Test: owner should be able to call the function (should NOT revert)
    // In the mutant, this would revert because msg.sender == owner()
    await expect(
      testModifier.connect(owner).testOnlyArtCreator(1)
    ).to.not.be.reverted;
    
    // Test: artist should be able to call the function
    await expect(
      testModifier.connect(artist).testOnlyArtCreator(1)
    ).to.not.be.reverted;
    
    // Test: unauthorized user should revert
    await expect(
      testModifier.connect(addr1).testOnlyArtCreator(1)
    ).to.be.revertedWith("NotArtCreator");
  });
});