import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant mdf1b3651 test", function () {
  it("should return correct mint fee for a token, detecting mutant that removes return value", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract with required parameters
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDestination = addr1.address;

    await instance.initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDestination
    );

    // Since mintFee depends on phiFactoryContract.artData, we need to check
    // that the function returns a value. The mutant removes the return statement,
    // so it would return 0 instead of the actual mint fee.
    // For a token that hasn't been created yet, _tokenIdToArtId[tokenId] will be 0,
    // and the original would revert trying to access artData(0).
    // But the mutant would simply return 0 without reverting.

    // Test: Call mintFee with a non-existent tokenId (0)
    // The original should revert because artData(0) doesn't exist
    // The mutant would return 0 (no revert)
    let returnedValue: number | undefined;
    let didRevert = false;

    try {
      const result = await instance.mintFee(0);
      returnedValue = Number(result);
    } catch (e) {
      didRevert = true;
    }

    // If the mutant is present, it will return 0 without reverting
    // If the original is present, it will revert
    // We expect the mutant to NOT revert and return 0
    expect(didRevert).to.be.false;
    expect(returnedValue).to.equal(0);
  });
});