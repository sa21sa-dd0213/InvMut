import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test - logFunded timestamp replacement", function () {
  it("should emit Funded event with block.timestamp, not block.prevrandao", async function () {
    const [owner, logger] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for DepositLog)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Approve the logger address
    await instance.connect(owner).setApprovedLogger(logger.address, true);
    
    // Get the current block timestamp before calling logFunded
    const blockBefore = await ethers.provider.getBlock("latest");
    const timestampBefore = blockBefore.timestamp;
    
    // Call logFunded from the approved logger
    const tx = await instance.connect(logger).logFunded();
    const receipt = await tx.wait();
    
    // Get the block timestamp after the transaction
    const blockAfter = await ethers.provider.getBlock(receipt.blockNumber);
    const timestampAfter = blockAfter.timestamp;
    
    // Find the Funded event
    const event = receipt.logs.find(
      (log: any) => {
        try {
          const parsed = instance.interface.parseLog(log);
          return parsed?.name === "Funded";
        } catch {
          return false;
        }
      }
    );
    
    expect(event).to.not.be.undefined;
    
    // Parse the event to get the emitted timestamp
    const parsedEvent = instance.interface.parseLog(event);
    const emittedTimestamp = parsedEvent.args[1]; // timestamp is the second argument
    
    // The emitted timestamp should be a block.timestamp, not block.prevrandao
    // block.prevrandao would be a 256-bit number, not a unix timestamp
    // A valid timestamp should be between the block before and after the transaction
    expect(emittedTimestamp).to.be.gte(timestampBefore);
    expect(emittedTimestamp).to.be.lte(timestampAfter);
    
    // Additionally, prevrandao values are typically very large (like hash values),
    // while timestamps are around 1.7 billion currently
    expect(emittedTimestamp).to.be.lessThan(2000000000); // Current timestamps are < 2e9
    
    // Also verify it's not a huge number like prevrandao would be
    expect(emittedTimestamp).to.not.be.greaterThan(ethers.MaxUint256.div(2));
  });
});