import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection test", function () {
  it("should detect mutant m5deadd9c by checking balance after depositing 1 wei", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (MY_BANK constructor requires a Log address)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Deposit exactly 1 wei
    const tx = await bank.connect(user).Put(0, { value: 1 });
    await tx.wait();
    
    // Check user's balance - should be 1 wei in original, but 0 in mutant
    const holder = await bank.Acc(await user.getAddress());
    expect(holder.balance).to.equal(1);
  });
});