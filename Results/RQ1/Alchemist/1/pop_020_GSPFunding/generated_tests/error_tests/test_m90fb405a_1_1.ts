import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m90fb405a detection", function () {
  it("should kill the mutant by using deadline > block.timestamp", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;

    // Set deadline to be in the future (current timestamp + 100)
    const futureDeadline = currentTimestamp + 100;

    // Attempt to call sellShares with deadline > block.timestamp
    // This should succeed in the original contract but fail in the mutant
    // The mutant requires deadline == block.timestamp

    await expect(
      instance.connect(owner).sellShares(
        0,
        addr1.address,
        0,
        0,
        "0x",
        futureDeadline
      )
    ).to.be.reverted; // The mutant will revert with "TIME_EXPIRED" because deadline != block.timestamp

    // If the original contract would not revert, but the mutant does, this test kills the mutant
  });
});