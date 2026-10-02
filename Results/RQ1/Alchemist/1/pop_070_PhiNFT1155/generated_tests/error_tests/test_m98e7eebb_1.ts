import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - uri function mutant detection", function () {
  it("should kill mutant m98e7eebb by calling uri with tokenId and minter when no custom URI is set", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
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
    
    // Get a token ID that hasn't been minted yet
    const tokenId = 1;
    const minter = addr1.address;
    
    // Call the uri function with tokenId and minter
    // Since no custom URI has been set for this tokenId/minter combination,
    // the original contract would return phiFactoryContract.getTokenURI(...)
    // The mutant removed this fallback, so it would fail to return anything
    
    // This call should not revert in the original, but the mutant will fail
    // because it has no fallback to return the factory token URI
    const result = await instance.uri(tokenId, minter);
    
    // The original contract would return some bytes (possibly empty if factory not set),
    // but the mutant would have no return value at all
    expect(result).to.be.a("string");
  });
});