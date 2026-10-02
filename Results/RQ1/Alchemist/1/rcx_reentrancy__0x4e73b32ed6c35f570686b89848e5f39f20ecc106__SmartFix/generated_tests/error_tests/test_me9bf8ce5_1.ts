import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant detection - me9bf8ce5", function () {
  it("should revert on zero-value deposit when balance is non-zero (kills multiplication mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (no constructor arguments)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PRIVATE_ETH_CELL (no constructor arguments)
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set MinSum to 0 for convenience
    await instance.SetMinSum(0);
    // Set LogFile address
    await instance.SetLogFile(await logFile.getAddress());
    // Initialize the contract
    await instance.Initialized();
    
    // First, make a deposit with a positive value to create non-zero balance
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).Deposit({ value: depositAmount });
    
    // Now attempt a zero-value deposit - this should fail on the mutant
    // because balance * 0 = 0 which is not >= balance (1 ether)
    await expect(
      instance.connect(addr1).Deposit({ value: 0 })
    ).to.be.reverted;
  });
});