import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL - Kill mutant mfe6805c6", function () {
  it("should revert when Collect is called with _am equal to sender's balance (mutant uses > instead of >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (no constructor arguments)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PRIVATE_ETH_CELL (no constructor arguments)
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set up the contract: initialize and set MinSum to 0 for simplicity
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).SetMinSum(0);
    await instance.connect(owner).Initialized();
    
    // Deposit exactly 1 ETH from addr1
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Deposit({ value: depositAmount });
    
    // Verify balance is exactly 1 ETH
    expect(await instance.balances(addr1.address)).to.equal(depositAmount);
    
    // Attempt to collect exactly 1 ETH (balance == _am)
    // Original allows this (>=), mutant rejects it (>) so should revert
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});