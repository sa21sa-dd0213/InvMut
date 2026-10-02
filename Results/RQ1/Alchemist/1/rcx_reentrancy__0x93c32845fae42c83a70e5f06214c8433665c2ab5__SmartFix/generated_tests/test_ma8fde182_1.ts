import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test", function () {
  it("should kill mutant ma8fde182 by testing Collect with balance >= MinSum but _am > balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // addr1 deposits exactly MinSum (1 ether)
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Verify balance is MinSum
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // addr1 tries to collect more than their balance (2 ether)
    // In original: should revert because acc.balance >= _am is false
    // In mutant: will proceed because acc.balance >= MinSum is true (OR condition)
    const collectAmount = ethers.parseEther("2");
    
    // This should revert on original, but pass on mutant (killing it)
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});