import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant detection - mf57869ed", function () {
  it("should allow deposit of 0 wei when balance is non-zero (mutant would revert)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (required by PRIVATE_ETH_CELL constructor)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PRIVATE_ETH_CELL with LogFile address and initial MinSum value
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set up the contract - set MinSum and LogFile, then initialize
    await instance.SetMinSum(1);
    await instance.SetLogFile(await logFile.getAddress());
    await instance.Initialized();
    
    // First deposit some ETH to addr1 to create a non-zero balance
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).Deposit({ value: depositAmount });
    
    // Now attempt to deposit 0 wei - this should succeed in the original contract
    // but the mutant would revert due to the "msg.value - 1" underflow check
    await expect(
      instance.connect(addr1).Deposit({ value: 0 })
    ).to.not.be.reverted;
    
    // Verify the balance hasn't changed (0 wei deposit)
    const balance = await instance.balances(addr1.address);
    expect(balance).to.equal(depositAmount);
  });
});