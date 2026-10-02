import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test", function () {
  it("should kill mutant m54322bcf by exploiting the changed comparison operator", async function () {
    const [owner, user] = await ethers.getSigners();
    
    const MONEY_BOX = await ethers.getContractFactory("MONEY_BOX");
    const instance = await MONEY_BOX.deploy();
    await instance.waitForDeployment();
    
    // Set MinSum to a specific value
    const minSum = ethers.parseEther("1.0");
    await instance.SetMinSum(minSum);
    
    // Initialize the contract
    await instance.Initialized();
    
    // User deposits 2 ETH (greater than MinSum) with lock time
    const depositAmount = ethers.parseEther("2.0");
    const lockTime = 3600; // 1 hour
    await instance.connect(user).Put(lockTime, { value: depositAmount });
    
    // Fast forward time past the unlock time
    await ethers.provider.send("evm_increaseTime", [lockTime + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect 1.5 ETH (valid amount: less than balance, greater than MinSum)
    const collectAmount = ethers.parseEther("1.5");
    
    // This should succeed on original (balance >= MinSum) but fail on mutant (balance <= MinSum is false)
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});