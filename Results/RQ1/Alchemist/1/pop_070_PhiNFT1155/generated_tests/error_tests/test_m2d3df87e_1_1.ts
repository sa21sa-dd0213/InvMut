import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m2d3df87e - onlyPhiFactory modifier removal", function () {
  it("should revert when non-PhiFactory address calls createArtFromFactory", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy PhiNFT1155 with constructor arguments
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract (required before calling createArtFromFactory)
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

    // Try to call createArtFromFactory from a non-PhiFactory address
    // The original contract has onlyPhiFactory modifier, so it should revert
    // The mutant removed the modifier, so it would NOT revert (killing the mutant)
    await expect(
      instance.connect(addr1).createArtFromFactory(1, { value: 0 })
    ).to.be.reverted;
  });
});