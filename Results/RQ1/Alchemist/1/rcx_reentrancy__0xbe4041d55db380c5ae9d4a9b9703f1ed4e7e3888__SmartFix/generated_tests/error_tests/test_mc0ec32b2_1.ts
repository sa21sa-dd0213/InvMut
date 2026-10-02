import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant mc0ec32b2 detection", function () {
  it("should detect || mutant by testing Collect with balance >= MinSum but balance < _am and time not unlocked", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy MONEY_BOX (no constructor arguments)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a Log contract for the LogFile
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Initialize the contract: set MinSum, set LogFile, and mark as initialized
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).Initialized();
    
    // addr1 puts 2 ETH (balance = 2 ETH, above MinSum of 1 ETH)
    await instance.connect(addr1).Put(100, { value: ethers.parseEther("2") });
    
    // Now try to Collect 3 ETH (more than balance) when unlock time hasn't passed
    // In original: acc.balance(2) >= MinSum(1) && acc.balance(2) >= _am(3) && time > unlockTime
    // Original fails because 2 >= 3 is false → revert
    // In mutant: acc.balance(2) >= MinSum(1) || (acc.balance(2) >= _am(3) && time > unlockTime)
    // Mutant passes because first condition (2 >= 1) is true (OR short-circuits)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("3"))
    ).to.be.reverted;
  });
});