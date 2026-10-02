import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant detection - m9a40b673", function () {
  it("should detect that block.prevrandao is used instead of block.timestamp in logRegisteredPubkey", async function () {
    const [owner, logger] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Owner approves logger address
    await instance.connect(owner).setApprovedLogger(logger.address, true);
    
    // Get the current block timestamp before calling the function
    const blockBefore = await ethers.provider.getBlock("latest");
    const expectedTimestamp = blockBefore!.timestamp;
    
    // Call logRegisteredPubkey as the approved logger
    const tx = await instance.connect(logger).logRegisteredPubkey(
      ethers.hexlify(ethers.randomBytes(32)),
      ethers.hexlify(ethers.randomBytes(32))
    );
    const receipt = await tx.wait();
    
    // Get the emitted event
    const event = receipt!.logs[0];
    const parsedEvent = instance.interface.parseLog({
      topics: event.topics,
      data: event.data
    });
    
    // The _timestamp parameter should be block.timestamp, not block.prevrandao
    // block.prevrandao would be a different value, causing this assertion to fail
    expect(parsedEvent!.args._timestamp).to.equal(expectedTimestamp);
  });
});