import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET - kill mutant m37dee58a (Collect balance==MinSum instead of >=MinSum)", function () {
  it("should revert when trying to collect with balance greater than MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    const MinSum = ethers.parseEther("1");
    
    // Deposit 2 ether (greater than MinSum)
    await instance.connect(addr1).Put(0, { value: ethers.parseEther("2") });
    
    // Verify balance is 2 ether
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(ethers.parseEther("2"));
    
    // Attempt to collect 1 ether - should succeed on original (balance >= MinSum)
    // but fail on mutant (balance == MinSum is false because balance is 2, not 1)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});