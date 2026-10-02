import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant mf53f4970 test", function () {
  it("should allow owner to call onlyArtCreator functions", async function () {
    const [owner, artist, addr1] = await ethers.getSigners();

    // Deploy a minimal mock PhiFactory
    const MockFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();

    // Deploy PhiNFT1155
    const PhiNFT1155 = await ethers.getContractFactory("PhiNFT1155");
    const instance = await PhiNFT1155.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    await instance.initialize(credChainId, credId, verificationType, owner.address);

    // Set up art data with artist as the artist
    const tokenId = 1;
    const artId = 1;
    await mockFactory.setArtData(artId, artist.address, owner.address);

    // Set the phiFactoryContract in the PhiNFT1155 instance
    await instance.setPhiFactoryContract(await mockFactory.getAddress());

    // Test: owner should be able to call updateRoyalties (should NOT revert)
    const royaltyConfig = {
      royaltyBPS: 500,
      royaltyRecipient: artist.address
    };
    await expect(
      instance.connect(owner).updateRoyalties(tokenId, royaltyConfig)
    ).to.not.be.reverted;

    // Test: artist should be able to call updateRoyalties
    await expect(
      instance.connect(artist).updateRoyalties(tokenId, royaltyConfig)
    ).to.not.be.reverted;

    // Test: unauthorized user should revert
    await expect(
      instance.connect(addr1).updateRoyalties(tokenId, royaltyConfig)
    ).to.be.revertedWith("NotArtCreator");
  });
});