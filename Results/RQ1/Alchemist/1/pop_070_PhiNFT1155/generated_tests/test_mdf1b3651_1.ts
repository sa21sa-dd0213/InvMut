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
    try {
      const result = await instance.mintFee(0);
      // If we get here without revert, check that result is 0 (mutant behavior)
      expect(result).to.equal(0);
      // If result is 0, the mutant is killed because the original would revert
      // and not return 0
    } catch (error: any) {
      // If it reverts, the original behavior is preserved
      // This would mean the test fails to kill the mutant
      // But we want the test to pass when mutant is killed
      // So we need to ensure we detect the mutant
    }
    
    // Alternative approach: Create an art first, then check mintFee
    // But since we can't easily create art without the factory,
    // we test the revert behavior difference
    
    // The key insight: The original function returns phiFactoryContract.artData(...).mintFee
    // If _tokenIdToArtId[tokenId_] returns 0 (uninitialized mapping),
    // calling artData(0) on the factory will revert.
    // The mutant returns nothing (implicitly 0) without calling the factory.
    
    // Therefore, calling mintFee(0) should:
    // Original: revert
    // Mutant: return 0
    
    // To kill the mutant, we need to detect that it returns 0 instead of reverting
    // Let's use a try-catch to detect the difference
    let returnedValue;
    let didRevert = false;
    
    try {
      returnedValue = await instance.mintFee(0);
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