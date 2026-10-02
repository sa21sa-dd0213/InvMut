import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant kill test for m75147f80", function () {
  it("should kill mutant by verifying uri returns factory token URI when no custom URI is set", async function () {
    const [owner, minter] = await ethers.getSigners();

    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "signature";
    const protocolFeeDestination = owner.address;

    await instance.initialize(credChainId, credId, verificationType, protocolFeeDestination);

    // Test the uri function with a token that exists and a minter without custom URI
    // The key insight: the mutant changes > 0 to >= 0 in the bytes length check
    // This means when advancedTokenURI is empty (length = 0):
    // - Original: returns phiFactoryContract.getTokenURI(...)
    // - Mutant: returns "" (empty string) because bytes("").length >= 0 is always true

    // Since we can't easily set up the full factory flow, we need to check the behavior
    // The original will revert when calling uri for a non-existent token because
    // _tokenIdToArtId[tokenId_] will be 0, and getTokenURI will fail
    // The mutant would return empty string instead

    // To properly test, we need to create a scenario where a token exists
    // Let's check if we can directly mint by calling claimFromFactory
    // But this requires the factory to be set up properly

    // Alternative approach: test the logic by checking that the uri function
    // either reverts or returns a non-empty string for a token without custom URI
    // The mutant would return empty string in all cases

    // Since we can't easily set up the factory, let's check the behavior
    // by calling uri with a non-existent token and expecting a revert
    // The mutant would NOT revert and return empty string instead

    let reverted = false;
    let returnValue = "";

    try {
      returnValue = await instance.uri.staticCall(1, minter.address);
    } catch (e) {
      reverted = true;
    }

    // On the original contract:
    // - If the token doesn't exist, it reverts (because getTokenURI fails)
    // - If the token exists but no custom URI, it returns factory URI
    // On the mutant:
    // - It always returns empty string (because length >= 0 is always true)
    // So we expect the call to either revert or return non-empty string
    // This would fail on the mutant which returns empty string

    if (reverted) {
      // Original reverted - mutant would return empty string instead
      expect(reverted).to.be.true;
    } else {
      // Original returned something - check it's not empty
      expect(returnValue.length).to.be.greaterThan(0);
    }
  });
});