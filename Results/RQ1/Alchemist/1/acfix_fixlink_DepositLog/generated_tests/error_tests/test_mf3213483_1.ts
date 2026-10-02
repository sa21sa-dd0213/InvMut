import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test - mf3213483", function () {
  it("should detect block.prevrandao instead of block.timestamp in logCreated", async function () {
    const [owner, logger] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for DepositLog)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Approve logger address
    await instance.connect(owner).setApprovedLogger(logger.address, true);
    
    // Capture block timestamp before the transaction
    const blockBefore = await ethers.provider.getBlock("latest");
    const timestampBefore = blockBefore!.timestamp;
    
    // Execute logCreated from the approved logger
    const tx = await instance.connect(logger).logCreated(owner.address);
    const receipt = await tx.wait();
    
    // Get the block where the transaction was mined
    const blockAfter = await ethers.provider.getBlock(receipt!.blockNumber);
    const blockTimestamp = blockAfter!.timestamp;
    
    // Get the emitted event
    const event = receipt!.logs[0];
    const parsedEvent = instance.interface.parseLog({
      topics: event.topics as string[],
      data: event.data
    });
    
    // The timestamp in the event should be block.timestamp, NOT block.prevrandao
    // block.prevrandao would be a 256-bit number, not a unix timestamp
    expect(parsedEvent!.args._timestamp).to.equal(blockTimestamp);
    
    // Additional check: timestamp should be within reasonable range (current time)
    const currentTime = Math.floor(Date.now() / 1000);
    expect(parsedEvent!.args._timestamp).to.be.closeTo(currentTime, 10);
    
    // block.prevrandao would not equal block.timestamp (extremely unlikely)
    expect(parsedEvent!.args._timestamp).to.not.equal(
      (await ethers.provider.getBlock("latest"))!.prevrandao
    );
  });
});