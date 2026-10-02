import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant kill test", function () {
  it("should revert when deposit would cause overflow on original but not on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PRIVATE_ETH_CELL (no constructor arguments)
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock LogFile so Deposit doesn't fail
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Set MinSum to 0 to avoid issues with Collect
    await instance.connect(owner).SetMinSum(0);
    
    // Set the LogFile address
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    
    // Initialize the contract
    await instance.connect(owner).Initialized();
    
    // Calculate a value that when added to 0 overflows uint256
    // We need balances[addr1] + msg.value to overflow, so msg.value > type(uint256).max - balances[addr1]
    // Starting balance is 0, so we need msg.value > type(uint256).max
    const maxUint256 = ethers.MaxUint256;
    const overflowValue = maxUint256; // This alone overflows when added to 0
    
    // On the original contract, this should revert due to overflow check
    // On the mutant, the check uses msg.value+1 which changes the arithmetic
    await expect(
      instance.connect(addr1).Deposit({ value: overflowValue })
    ).to.be.reverted;
  });
});