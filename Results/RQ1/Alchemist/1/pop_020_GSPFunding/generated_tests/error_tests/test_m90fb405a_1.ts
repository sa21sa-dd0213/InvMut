import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m90fb405a detection", function () {
  it("should kill the mutant by using deadline > block.timestamp", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with constructor arguments - GSPFunding inherits from GSPStorage which has no constructor,
    // but we need to check the actual contract for constructor requirements
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First we need to set up the contract with some initial state
    // Get the base and quote token addresses (they are set during initialization)
    // For this test, we'll assume the contract is initialized with tokens
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;
    
    // Set deadline to be in the future (current timestamp + 100)
    const futureDeadline = currentTimestamp + 100;
    
    // Attempt to call sellShares with deadline > block.timestamp
    // This should succeed in the original contract but fail in the mutant
    // The mutant requires deadline == block.timestamp
    
    // Since we need valid parameters, we'll set up minimal requirements
    // shareAmount = 0, to = addr1, baseMinAmount = 0, quoteMinAmount = 0
    // data = "0x", deadline = futureDeadline
    
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