import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant test - mcf187911", function () {
  it("should revert when user tries to withdraw less than balance (mutant fails)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (no constructor args)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PRIVATE_ETH_CELL (no constructor args)
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: set MinSum, set LogFile address, initialize
    await instance.connect(owner).SetMinSum(1);
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();
    
    // Deposit 2 ETH from addr1 (balance becomes 2)
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Deposit({ value: depositAmount });
    
    // Try to collect 1 ETH (less than balance of 2)
    // Original: should succeed (balance 2 >= 1)
    // Mutant: should revert because 2 <= 1 is false
    const collectAmount = ethers.parseEther("1");
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});