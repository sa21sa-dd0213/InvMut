import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant detection - m751019c0", function () {
  it("should detect block.prevrandao used instead of block.timestamp in logRedeemed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for DepositLog)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Owner approves addr1 as a logger
    await instance.connect(owner).setApprovedLogger(addr1.address, true);
    
    // Call logRedeemed from approved logger
    const tx = await instance.connect(addr1).logRedeemed(
      ethers.encodeBytes32String("testTxid")
    );
    const receipt = await tx.wait();
    
    // Get the Redeemed event from the transaction
    const event = receipt.logs[0];
    const decodedEvent = instance.interface.parseLog({
      topics: event.topics,
      data: event.data
    });
    
    // The timestamp parameter is the third parameter (index 2)
    const emittedTimestamp = decodedEvent.args[2];
    
    // Get the block where the transaction was mined
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    const expectedTimestamp = block.timestamp;
    
    // Verify the emitted timestamp matches block.timestamp (not block.prevrandao)
    // block.prevrandao is typically a large number but unrelated to timestamp
    // This should fail for the mutant since it would emit block.prevrandao instead
    expect(emittedTimestamp).to.equal(expectedTimestamp);
    
    // Additional verification: timestamp should be a reasonable unix timestamp
    // (greater than 1,500,000,000 for recent blocks)
    expect(emittedTimestamp).to.be.greaterThan(1500000000);
  });
});