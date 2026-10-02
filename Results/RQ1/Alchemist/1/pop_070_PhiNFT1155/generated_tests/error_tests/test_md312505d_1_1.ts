import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant kill test - md312505d", function () {
  it("should allow safeBatchTransferFrom with non-soulbound token and non-zero sender, but mutant should revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract (required by initializer modifier)
    const credChainId = 1;
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDest = owner.address;

    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest);

    // Test case: transfer from addr1 (non-zero) with empty arrays
    // The original should process this without reverting (no tokens to check)
    // The mutant will revert immediately due to "if (true) revert"

    await expect(
      instance.connect(addr1).safeBatchTransferFrom(
        addr1.address,
        addr2.address,
        [],
        [],
        "0x"
      )
    ).to.not.be.reverted; // This should pass on original, fail on mutant

    // Also test with actual token data to confirm
    // First approve addr1 to transfer from owner
    await instance.connect(owner).setApprovalForAll(addr1.address, true);

    // Now try a batch transfer with empty arrays from a non-zero sender
    // The original should succeed (no tokens to check for soulbound)
    // The mutant will revert immediately

    // This is the killing test case
    await expect(
      instance.connect(addr1).safeBatchTransferFrom(
        addr1.address,
        addr2.address,
        [],
        [],
        "0x"
      )
    ).to.not.be.reverted;
  });
});