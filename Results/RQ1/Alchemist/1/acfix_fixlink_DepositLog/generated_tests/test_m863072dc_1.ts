import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant m863072dc - logSetupFailed timestamp", function () {
  it("should emit SetupFailed with block.timestamp, not block.prevrandao", async function () {
    const [owner, logger] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve logger address
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Capture block timestamp before the call
    const blockBefore = await ethers.provider.getBlock("latest");
    const expectedTimestamp = blockBefore!.timestamp;

    // Call logSetupFailed from approved logger
    const tx = await instance.connect(logger).logSetupFailed();
    const receipt = await tx.wait();

    // Verify event was emitted with correct timestamp
    await expect(tx)
      .to.emit(instance, "SetupFailed")
      .withArgs(logger.address, expectedTimestamp);

    // Additional check: timestamp should be close to current block time
    const blockAfter = await ethers.provider.getBlock(receipt!.blockNumber);
    expect(blockAfter!.timestamp).to.be.at.least(expectedTimestamp);
    expect(blockAfter!.timestamp - expectedTimestamp).to.be.lessThan(30); // reasonable delta
  });
});