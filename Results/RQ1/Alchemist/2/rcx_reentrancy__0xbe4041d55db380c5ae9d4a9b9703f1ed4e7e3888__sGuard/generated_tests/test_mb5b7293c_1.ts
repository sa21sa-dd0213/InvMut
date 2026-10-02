import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant mb5b7293c test", function () {
  it("should detect timestamp vs prevrandao mutation in Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await instance.connect(owner).SetLogFile(await instance.getAddress());
    await instance.connect(owner).Initialized();

    // Set a lock time of 1 hour (3600 seconds)
    const lockTime = 3600;
    
    // Record current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;
    
    // Put 1 ether with lock time
    const putTx = await instance.connect(addr1).Put(lockTime, { value: ethers.parseEther("1") });
    await putTx.wait();

    // Try to collect immediately (should fail because unlock time hasn't passed)
    // In the original, unlockTime = currentTimestamp + lockTime
    // In the mutant, unlockTime = block.prevrandao + lockTime (different value)
    const collectTx = instance.connect(addr1).Collect(ethers.parseEther("0.5"));
    
    // The original should revert because currentTimestamp < currentTimestamp + lockTime
    // The mutant might allow collection if block.prevrandao < currentTimestamp
    await expect(collectTx).to.be.reverted;
  });
});