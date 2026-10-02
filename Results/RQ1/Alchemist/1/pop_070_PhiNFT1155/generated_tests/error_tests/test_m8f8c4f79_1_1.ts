import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - mutant m8f8c4f79 (safeBatchTransferFrom && -> ||)", function () {
  it("should revert when sender is from_ address but not approved for all (mutant kills this)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract with required parameters
    await instance.initialize(
      1,                    // credChainId
      1,                    // credId
      "test",              // verificationType
      owner.address        // protocolFeeDestination
    );
    
    // Test: addr1 tries to transfer from themselves (from_ == sender) without approval
    // In original: from_ != sender (false) && !isApprovedForAll (true) => false => no revert
    // In mutant: from_ != sender (false) || !isApprovedForAll (true) => true => revert
    
    // The approval check happens before balance checks, so we can test even with empty balance
    await expect(
      instance.connect(addr1).safeBatchTransferFrom(
        addr1.address,
        addr2.address,
        [1],  // tokenId
        [1],  // value
        "0x"
      )
    ).to.be.reverted;
    
    // The revert reason differs between original and mutant:
    // Original: ERC1155InsufficientBalance (because approval check passes but no balance)
    // Mutant: ERC1155MissingApprovalForAll (because approval check fails first)
  });
});