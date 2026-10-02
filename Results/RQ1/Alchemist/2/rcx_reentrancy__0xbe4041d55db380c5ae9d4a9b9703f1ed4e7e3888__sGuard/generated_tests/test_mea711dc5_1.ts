import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test - mea711dc5", function () {
  it("should revert on original when collecting exactly at unlockTime, but mutant allows it", async function () {
    const [owner, user] = await ethers.getSigners();
    
    const MONEY_BOX = await ethers.getContractFactory("MONEY_BOX");
    const contract = await MONEY_BOX.deploy();
    await contract.waitForDeployment();
    
    // Initialize the contract
    await contract.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await contract.connect(owner).SetLogFile(await contract.getAddress()); // Using itself as log for simplicity
    await contract.connect(owner).Initialized();
    
    // Set lock time to 100 seconds from now
    const lockTime = 100;
    const depositAmount = ethers.parseEther("1");
    
    // Deposit with lock time
    await contract.connect(user).Put(lockTime, { value: depositAmount });
    
    // Get the current block timestamp and calculate the exact unlock time
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const exactUnlockTime = blockBefore.timestamp + lockTime;
    
    // Mine a block to reach exactly the unlock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [exactUnlockTime]);
    await ethers.provider.send("evm_mine");
    
    // Attempt to collect exactly at unlockTime
    // Original would revert (strict >), mutant would succeed (>=)
    await expect(
      contract.connect(user).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});