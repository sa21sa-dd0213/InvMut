import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant kill test - uri(uint256) function removal", function () {
  it("should revert when calling uri(uint256) with a tokenId that has no custom URI, because the single-parameter uri function is missing in the mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy PhiNFT1155 - constructor has no arguments (constructor is empty with _disableInitializers())
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract with required parameters
    // initialize(credChainId, credId, verificationType, protocolFeeDestination)
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDestination = owner.address;
    
    await instance.initialize(credChainId, credId, verificationType, protocolFeeDestination);

    // Since the mutant removes the single-parameter uri(uint256) function,
    // calling it should fail because the function doesn't exist
    // We need to create a tokenId first by calling createArtFromFactory through the phiFactoryContract
    // But since phiFactoryContract is set to msg.sender during initialize (owner),
    // we can try to call uri directly with any tokenId
    
    // The original contract has uri(uint256) that calls phiFactoryContract.getTokenURI()
    // The mutant removes this function entirely
    
    // Try to call the uri function with a tokenId - this should fail because the function is missing
    await expect(
      instance.uri(1)
    ).to.be.reverted; // Will revert because function doesn't exist or revert due to missing implementation
  });
});