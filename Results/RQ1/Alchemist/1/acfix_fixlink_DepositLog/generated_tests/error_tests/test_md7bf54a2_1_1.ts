import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant detection - md7bf54a2", function () {
  it("should kill mutant by verifying block.timestamp is emitted in StartedLiquidation event", async function () {
    const [owner, logger] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Approve logger
    await instance.connect(owner).setApprovedLogger(await logger.getAddress(), true);
    
    // Record block timestamp before calling
    const blockBefore = await ethers.provider.getBlock("latest");
    const expectedTimestamp = blockBefore!.timestamp;
    
    // Call logStartedLiquidation from approved logger
    const tx = await instance.connect(logger).logStartedLiquidation(true);
    const receipt = await tx.wait();
    
    // Get the event
    const event = receipt!.logs[0];
    const parsedEvent = instance.interface.parseLog({
      topics: event.topics,
      data: event.data,
    });
    
    // Verify the timestamp field matches block.timestamp
    expect(parsedEvent!.args._timestamp).to.equal(expectedTimestamp);
  });
});