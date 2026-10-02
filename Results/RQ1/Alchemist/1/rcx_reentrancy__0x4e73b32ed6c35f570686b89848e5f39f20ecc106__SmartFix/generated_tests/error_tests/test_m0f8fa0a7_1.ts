import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant detection", function () {
  it("should detect mutant m0f8fa0a7 by verifying balance decreases after Collect", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first (no constructor arguments needed)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PRIVATE_ETH_CELL (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await instance.connect(owner).Initialized();
    
    // Deposit 1 ETH from user
    const depositAmount = ethers.parseEther("1");
    await instance.connect(user).Deposit({ value: depositAmount });
    
    // Check balance before Collect
    const balanceBefore = await instance.balances(user.address);
    
    // Collect 0.5 ETH (valid amount, meets MinSum)
    const collectAmount = ethers.parseEther("0.5");
    await instance.connect(user).Collect(collectAmount);
    
    // Check balance after Collect
    const balanceAfter = await instance.balances(user.address);
    
    // In original: balance decreases by collectAmount
    // In mutant: balance increases by collectAmount
    // Assert balance decreased (original behavior) - mutant will fail this assertion
    expect(balanceAfter).to.equal(balanceBefore - collectAmount);
  });
});