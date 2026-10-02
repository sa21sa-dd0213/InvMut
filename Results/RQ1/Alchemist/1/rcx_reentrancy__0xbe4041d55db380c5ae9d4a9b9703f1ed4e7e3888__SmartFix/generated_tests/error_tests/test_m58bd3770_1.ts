import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test - m58bd3770", function () {
  it("should detect the >= vs <= mutation in Collect by withdrawing less than full balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy MONEY_BOX (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy Log contract (no constructor arguments needed)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Initialize the contract: set MinSum, set LogFile, and call Initialized
    const minSum = ethers.parseEther("1");
    await (await instance.connect(owner).SetMinSum(minSum)).wait();
    await (await instance.connect(owner).SetLogFile(await logInstance.getAddress())).wait();
    await (await instance.connect(owner).Initialized()).wait();
    
    // addr1 puts 10 ETH into the contract with lockTime = 0 (unlock immediately)
    const depositAmount = ethers.parseEther("10");
    await (await instance.connect(addr1).Put(0, { value: depositAmount })).wait();
    
    // Verify addr1's balance is 10 ETH
    const acc = await instance.Acc(addr1.address);
    expect(acc.balance).to.equal(depositAmount);
    
    // Now addr1 tries to collect 5 ETH (less than their full balance)
    const withdrawAmount = ethers.parseEther("5");
    
    // In the ORIGINAL contract, this should succeed (balance 10 >= 5 and >= MinSum 1)
    // In the MUTANT (balance <= _am), balance 10 <= 5 is FALSE, so it should revert
    await expect(
      instance.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});