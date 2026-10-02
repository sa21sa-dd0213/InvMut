import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant kill test for logGotRedemptionSignature", function () {
  it("should detect missing block.timestamp in GotRedemptionSignature event", async function () {
    const [owner, logger] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for DepositLog)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Approve the logger
    await instance.connect(owner).setApprovedLogger(logger.address, true);
    
    // Get current block timestamp before calling
    const blockBefore = await ethers.provider.getBlock("latest");
    const timestampBefore = blockBefore!.timestamp;
    
    // Call logGotRedemptionSignature with test parameters
    const tx = await instance.connect(logger).logGotRedemptionSignature(
      ethers.hexlify(ethers.randomBytes(32)), // _digest
      ethers.hexlify(ethers.randomBytes(32)), // _r
      ethers.hexlify(ethers.randomBytes(32))  // _s
    );
    
    const receipt = await tx.wait();
    
    // Get block timestamp after transaction
    const blockAfter = await ethers.provider.getBlock(receipt!.blockNumber);
    const timestampAfter = blockAfter!.timestamp;
    
    // Find the GotRedemptionSignature event
    const event = receipt!.logs.find(
      (log: any) => log.topics[0] === ethers.id("GotRedemptionSignature(address,bytes32,bytes32,bytes32,uint256)")
    );
    
    expect(event).to.not.be.undefined;
    
    // Decode the event data (last 32 bytes should be the timestamp)
    const decodedData = ethers.AbiCoder.defaultAbiCoder().decode(
      ["bytes32", "bytes32", "uint256"],
      event!.data
    );
    
    const emittedTimestamp = decodedData[2];
    
    // Verify timestamp is within expected range (between block before and after)
    expect(Number(emittedTimestamp)).to.be.at.least(timestampBefore);
    expect(Number(emittedTimestamp)).to.be.at.most(timestampAfter);
    
    // The mutant removes block.timestamp, so it would either:
    // 1. Fail to decode properly (different event signature)
    // 2. Emit a different value (likely zero or missing parameter)
    // This assertion should fail on the mutant
  });
});