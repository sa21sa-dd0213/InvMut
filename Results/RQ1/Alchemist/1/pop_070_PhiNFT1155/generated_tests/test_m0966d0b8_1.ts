import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m0966d0b8 - supportsInterface", function () {
  it("should detect mutant where || is replaced with && in supportsInterface", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required before calling supportsInterface)
    const credChainId = 1;
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDestination = owner.address;
    
    await instance.initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDestination
    );
    
    // IERC1155 interface ID (0xd9b67a26)
    const IERC1155_INTERFACE_ID = "0xd9b67a26";
    
    // In the original contract, supportsInterface(IERC1155_INTERFACE_ID) returns true
    // because IERC1155 is checked in the super.supportsInterface() call
    // In the mutant with &&, it will return false because IERC1155 != IPhiNFT1155
    
    const result = await instance.supportsInterface(IERC1155_INTERFACE_ID);
    
    // Original: returns true (IERC1155 is supported)
    // Mutant: returns false (requires both super AND IPhiNFT1155 interfaces to match)
    expect(result).to.equal(true);
  });
});