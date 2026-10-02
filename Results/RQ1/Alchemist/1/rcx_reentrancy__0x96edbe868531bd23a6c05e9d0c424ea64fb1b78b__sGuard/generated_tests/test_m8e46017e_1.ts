import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m8e46017e detection test", function () {
  it("should detect mutant that replaces >= with == in Collect function", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy contracts
    const LogFactory = await ethers.getContractFactory("LogFile");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: set MinSum and initialize
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));
    await instance.connect(owner).SetLogFile(await log.getAddress());
    await instance.connect(owner).Initialized();
    
    // User deposits 10 ETH with lock time
    const depositAmount = ethers.parseEther("10");
    const lockTime = 1; // 1 second lock
    await instance.connect(user).Put(lockTime, { value: depositAmount });
    
    // Wait for lock time to pass
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // User tries to collect only 5 ETH (partial amount, not full balance)
    const collectAmount = ethers.parseEther("5");
    
    // On original: should succeed because balance (10) >= amount (5) and >= MinSum (1)
    // On mutant: should fail because balance (10) != amount (5)
    const tx = instance.connect(user).Collect(collectAmount);
    
    // The mutant will revert or leave balance unchanged
    await expect(tx).to.be.reverted;
    
    // Alternative: check that balance remains unchanged if the transaction doesn't revert
    // (some mutants might silently fail instead of reverting)
    const balanceBefore = await instance.Acc(user.address);
    try {
      await (await tx).wait();
    } catch (e) {
      // Expected revert - mutant killed
      return;
    }
    
    // If no revert, verify balance wasn't reduced (mutant didn't allow partial withdrawal)
    const balanceAfter = await instance.Acc(user.address);
    expect(balanceAfter.balance).to.equal(balanceBefore.balance);
  });
});