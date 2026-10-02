import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test for m5deadd9c", function () {
  it("should kill mutant by sending exactly 1 wei and checking balance is 1 wei", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Send exactly 1 wei to Put function via user
    const tx = await bank.connect(user).Put(0, { value: 1 });
    await tx.wait();
    
    // Check that the recorded balance for user is exactly 1 wei
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(1);
    
    // Additional check: verify the balance is not 0 (which mutant would produce)
    expect(holder.balance).to.not.equal(0);
  });
});