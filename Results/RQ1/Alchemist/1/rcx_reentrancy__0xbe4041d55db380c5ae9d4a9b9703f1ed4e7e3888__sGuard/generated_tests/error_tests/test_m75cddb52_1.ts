import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m75cddb52 test", function () {
  it("should detect that Put uses block.prevrandao instead of block.timestamp in unlock time condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 to allow Collect
    await (await instance.SetMinSum(0)).wait();
    
    // Initialize the contract
    await (await instance.Initialized()).wait();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;

    // Call Put with a lock time of 100 seconds
    const lockTime = 100;
    const putAmount = ethers.parseEther("1");
    await (await instance.connect(addr1).Put(lockTime, { value: putAmount })).wait();

    // Get the holder's unlock time
    const holder = await instance.Acc(addr1.address);
    const unlockTime = holder.unlockTime;

    // In the original contract, unlockTime should be currentTimestamp + lockTime
    // In the mutant, the condition uses block.prevrandao instead of block.timestamp,
    // so the unlock time might not be set correctly
    expect(unlockTime).to.equal(currentTimestamp + lockTime);
  });
});