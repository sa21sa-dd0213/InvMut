import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m2a8dcf68 test", function () {
  it("should kill mutant by collecting less than balance when balance > amount", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set minimum sum to 0 so balance condition is easily met
    await instance.SetMinSum(0);
    
    // Initialize the contract (required before Put/Collect)
    await instance.Initialized();
    
    // Set log file (required by Put/Collect)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await instance.SetLogFile(await logInstance.getAddress());
    
    // User deposits 10 ether with lock time 0 (immediately unlockable)
    await instance.connect(user).Put(0, { value: ethers.parseEther("10") });
    
    // Advance time to pass the unlock (block.timestamp + 0 is already passed)
    await ethers.provider.send("evm_mine", []);
    
    // User tries to collect 5 ether while having 10 ether balance
    // Original contract would succeed (balance >= amount), mutant requires exact match
    await expect(
      instance.connect(user).Collect(ethers.parseEther("5"))
    ).to.be.reverted;
  });
});