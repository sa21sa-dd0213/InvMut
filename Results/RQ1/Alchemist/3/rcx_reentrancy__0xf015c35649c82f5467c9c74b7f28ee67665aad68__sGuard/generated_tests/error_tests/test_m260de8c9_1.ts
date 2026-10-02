import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - mutant m260de8c9 detection", function () {
  it("should revert when trying to collect less than balance (mutant changes >= to <=)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor arg for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const bankAddress = await bank.getAddress();
    const depositAmount = ethers.parseEther("5");
    const collectAmount = ethers.parseEther("2");
    
    // User deposits 5 ether with unlock time in the past (block.timestamp)
    await bank.connect(user).Put(0, { value: depositAmount });
    
    // Verify balance is 5 ether
    const holder = await bank.Acc(await user.getAddress());
    expect(holder.balance).to.equal(depositAmount);
    
    // User tries to collect 2 ether (less than their 5 ether balance)
    // Original: should succeed (balance >= _am)
    // Mutant: should revert (balance <= _am is false when balance > _am)
    await expect(
      bank.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});