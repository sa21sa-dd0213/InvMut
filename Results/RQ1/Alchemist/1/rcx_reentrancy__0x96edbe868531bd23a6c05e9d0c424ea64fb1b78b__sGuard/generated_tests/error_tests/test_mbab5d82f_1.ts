import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PENNY_BY_PENNY mutant mbab5d82f test", function () {
  it("should allow Collect when balance equals _am (original behavior), mutant fails", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first (needed by PENNY_BY_PENNY)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY - no constructor arguments needed
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: set MinSum to 0 and set LogFile
    await instance.connect(owner).SetMinSum(0);
    await instance.connect(owner).SetLogFile(await log.getAddress());
    await instance.connect(owner).Initialized();
    
    // Deposit exactly 1 ether with lock time 0
    const depositAmount = ethers.parseEther("1");
    await instance.connect(user).Put(0, { value: depositAmount });
    
    // Verify balance is exactly 1 ether
    const holder = await instance.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Attempt to collect exactly the balance amount (1 ether)
    // Original contract: acc.balance >= _am allows this (1 >= 1 is true)
    // Mutant: acc.balance > _am rejects this (1 > 1 is false)
    const tx = await instance.connect(user).Collect(depositAmount);
    const receipt = await tx.wait();
    
    // If mutant is present, the transaction will not revert but balance won't change
    // Check that balance decreased (original behavior) - if mutant, balance stays same
    const holderAfter = await instance.Acc(user.address);
    expect(holderAfter.balance).to.equal(0);
    
    // Also verify the event was logged
    const history = await log.History(0);
    expect(history.Val).to.equal(depositAmount);
  });
});