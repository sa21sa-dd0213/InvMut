import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant kill test - m3a2a3ca3", function () {
  it("should kill the mutant by allowing owner to transfer their own tokens without approval", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract with required parameters
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );

    // The key test: owner should be able to call safeTransferFrom with themselves as 'from'
    // without having approved themselves. The mutant will incorrectly revert with
    // ERC1155MissingApprovalForAll. The original will pass the approval check and
    // proceed to fail on balance check with a different error.
    
    try {
      await instance.connect(owner).safeTransferFrom(
        owner.address, // from
        addr1.address, // to
        999, // non-existent token id
        1, // value
        "0x" // data
      );
      // If we get here, something unexpected happened (should have reverted)
      expect.fail("Should have reverted");
    } catch (error: any) {
      const msg = error.message;
      // Mutant will revert with "ERC1155MissingApprovalForAll"
      // Original will revert with a different error (like ERC1155InvalidSender or ERC1155InsufficientBalance)
      expect(msg).to.not.include(
        "ERC1155MissingApprovalForAll",
        "Mutant detected: approval check incorrectly reverted for owner transferring own tokens"
      );
    }
  });
});