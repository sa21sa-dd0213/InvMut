import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test - kill me76e7d8f", function () {
  it("should revert when balance < MinSum and balance < _am but unlock time has passed (mutant uses || instead of &&)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy MONEY_BOX - no constructor arguments needed
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy Log contract (required by MONEY_BOX)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Initialize the contract and set MinSum and LogFile
    await (await instance.SetMinSum(ethers.parseEther("10"))).wait();
    await (await instance.SetLogFile(await logInstance.getAddress())).wait();
    await (await instance.Initialized()).wait();
    
    // User puts 1 ether with a short lock time (1 second)
    const depositAmount = ethers.parseEther("1");
    await (await instance.connect(user).Put(1, { value: depositAmount })).wait();
    
    // Wait for unlock time to pass
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to collect 5 ether (which is more than balance of 1 ether and less than MinSum of 10 ether)
    // In original: should revert because balance < MinSum (1 < 10) AND balance < _am (1 < 5)
    // In mutant: would succeed because block.timestamp > unlockTime is true, allowing withdrawal despite insufficient balance
    await expect(
      instance.connect(user).Collect(ethers.parseEther("5"))
    ).to.be.reverted;
  });
});