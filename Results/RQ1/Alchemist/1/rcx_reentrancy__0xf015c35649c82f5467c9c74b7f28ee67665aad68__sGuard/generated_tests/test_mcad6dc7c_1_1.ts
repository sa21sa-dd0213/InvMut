import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK", function () {
  let myBank: any;
  let log: any;
  let owner: any;
  let addr1: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const Log = await ethers.getContractFactory("Log");
    log = await Log.deploy();
    await log.deployed();

    const MY_BANK = await ethers.getContractFactory("MY_BANK");
    myBank = await MY_BANK.deploy(log.address);
    await myBank.deployed();
  });

  it("should accept deposits and update balance", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    await myBank.connect(addr1).Put(0, { value: depositAmount });
    
    const holder = await myBank.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
  });

  it("should allow withdrawal after unlock time", async function () {
    const depositAmount = ethers.utils.parseEther("2");
    const futureTime = Math.floor(Date.now() / 1000) + 1000;
    
    // Deposit
    await myBank.connect(addr1).Put(futureTime, { value: depositAmount });
    
    // Advance time
    await ethers.provider.send("evm_increaseTime", [1001]);
    await ethers.provider.send("evm_mine", []);
    
    // Withdraw
    await myBank.connect(addr1).Collect(depositAmount);
    
    const holder = await myBank.Acc(addr1.address);
    expect(holder.balance).to.equal(0);
  });

  it("should revert withdrawal if balance too low", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const futureTime = Math.floor(Date.now() / 1000) + 1000;
    
    await myBank.connect(addr1).Put(futureTime, { value: depositAmount });
    
    await ethers.provider.send("evm_increaseTime", [1001]);
    await ethers.provider.send("evm_mine", []);
    
    // MinSum is 1 ether, so trying to withdraw 2 ether should fail
    await expect(
      myBank.connect(addr1).Collect(ethers.utils.parseEther("2"))
    ).to.be.reverted;
  });
});