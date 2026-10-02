import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant test - m6225ed09", function () {
  it("should detect mutant where >= MinSum changed to > MinSum", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first (required by PRIVATE_ETH_CELL)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PRIVATE_ETH_CELL (no constructor arguments)
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("10"));
    await instance.connect(owner).Initialized();
    
    // User deposits exactly MinSum (10 ETH)
    const depositTx = await instance.connect(user).Deposit({ value: ethers.parseEther("10") });
    await depositTx.wait();
    
    // Verify balance is exactly MinSum
    const balance = await instance.balances(await user.getAddress());
    expect(balance).to.equal(ethers.parseEther("10"));
    
    // Attempt to collect 5 ETH (balance equals MinSum, should succeed in original)
    const collectTx = instance.connect(user).Collect(ethers.parseEther("5"));
    
    // In the mutant, this will revert because balance > MinSum is false when balance == MinSum
    // In the original, this should succeed
    await expect(collectTx).to.be.reverted;
  });
});