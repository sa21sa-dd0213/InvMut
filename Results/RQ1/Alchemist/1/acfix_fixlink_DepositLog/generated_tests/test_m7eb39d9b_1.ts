import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant m7eb39d9b test", function () {
  it("should detect block.timestamp replaced with block.prevrandao in logExitedCourtesyCall", async function () {
    const [owner, logger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve logger
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Get current block timestamp before calling
    const blockBefore = await ethers.provider.getBlock("latest");
    const expectedTimestamp = blockBefore.timestamp;

    // Call logExitedCourtesyCall from approved logger
    const tx = await instance.connect(logger).logExitedCourtesyCall();
    const receipt = await tx.wait();

    // Check that the event was emitted with block.timestamp (not block.prevrandao)
    const event = receipt.logs.find(
      (log) => log.fragment.name === "ExitedCourtesyCall"
    );
    expect(event).to.not.be.undefined;
    
    // The timestamp in the event should be >= block.timestamp before tx
    // (block.prevrandao would be a different value, typically much larger)
    const eventTimestamp = event.args._timestamp;
    expect(eventTimestamp).to.be.closeTo(expectedTimestamp, 1); // allow 1 second drift
  });
});