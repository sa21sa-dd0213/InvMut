import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant mfc27e025 detection", function () {
  it("should detect the mutant by verifying that Put with a positive _lockTime prevents immediate Collect", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy MONEY_BOX (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await (await instance.Initialized()).wait();
    
    // Set minimum sum to 0 so any balance passes the check
    await (await instance.SetMinSum(0)).wait();
    
    // Set LogFile to a valid address (deploy a Log contract)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await (await instance.SetLogFile(await logInstance.getAddress())).wait();
    
    // User puts 1 ether with a lock time of 1 hour (3600 seconds)
    const lockTime = 3600;
    const depositAmount = ethers.parseEther("1");
    
    await (await instance.connect(user).Put(lockTime, { value: depositAmount })).wait();
    
    // Attempt to collect the full amount immediately
    // On the original contract, this should revert because unlockTime is in the future
    // On the mutant (where unlockTime = block.timestamp - _lockTime), it would succeed
    await expect(
      instance.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});