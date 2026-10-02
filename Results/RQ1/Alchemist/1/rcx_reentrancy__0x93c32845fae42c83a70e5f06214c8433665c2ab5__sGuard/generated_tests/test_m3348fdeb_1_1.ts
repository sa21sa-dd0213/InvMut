import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test - m3348fdeb", function () {
  it("should allow partial withdrawal (kill mutant that changed >= to ==)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (needed as constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Deposit 2 ether into the contract from addr1
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Attempt to withdraw 1 ether (partial withdrawal)
    const withdrawAmount = ethers.parseEther("1");
    
    // On original contract this should succeed, on mutant it should revert
    // because mutant requires acc.balance == _am (exact match) instead of >=
    await expect(
      instance.connect(addr1).Collect(withdrawAmount)
    ).to.not.be.reverted;
    
    // Verify balance was reduced by 1 ether
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(ethers.parseEther("1"));
  });
});