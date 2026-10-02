import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m2f010c39 test", function () {
  it("should revert when withdrawing more than balance (original) but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Set MinSum to 1 ether (default) - need to deposit at least that much
    const depositAmount = ethers.parseEther("1");
    const withdrawAmount = ethers.parseEther("2"); // More than deposited
    
    // Deposit exactly 1 ether from addr1
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Verify balance is 1 ether
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Try to withdraw 2 ether - should revert in original (balance < withdraw amount)
    // But in mutant (balance <= _am) this would succeed (1 <= 2 is true)
    await expect(
      instance.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
    
    // If the test passes (reverts), it kills the mutant because the mutant would not revert
    // The mutant would allow the withdrawal, making this test fail
  });
});