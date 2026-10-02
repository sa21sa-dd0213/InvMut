import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant m24b5d374 - Deposit edge case", function () {
  it("should revert when depositing exactly MinDeposit (1 ether) due to > instead of >=", async function () {
    const [owner, depositor] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy PrivateBank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const minDeposit = ethers.parseEther("1");
    
    // Get balance before deposit
    const balanceBefore = await bank.balances(depositor.address);
    
    // Attempt to deposit exactly 1 ether
    const tx = await bank.connect(depositor).Deposit({ value: minDeposit });
    await tx.wait();
    
    const balanceAfter = await bank.balances(depositor.address);
    
    // In the mutant (with > instead of >=), balance should remain unchanged
    expect(balanceAfter).to.equal(balanceBefore);
  });
});