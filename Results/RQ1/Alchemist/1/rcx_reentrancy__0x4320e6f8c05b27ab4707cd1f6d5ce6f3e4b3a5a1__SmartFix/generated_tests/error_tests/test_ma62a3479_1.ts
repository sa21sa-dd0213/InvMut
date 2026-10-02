import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant detection - ma62a3479", function () {
  it("should detect mutant where >= MinSum is changed to > MinSum in Collect", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy ACCURAL_DEPOSIT (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy LogFile to set as Log (needed for Deposit to work)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Set the LogFile address
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    
    // Initialize the contract
    await instance.connect(owner).Initialized();
    
    // Set MinSum to 1 ether
    const minSum = ethers.parseEther("1");
    await instance.connect(owner).SetMinSum(minSum);
    
    // User deposits exactly MinSum (1 ether)
    await instance.connect(user).Deposit({ value: minSum });
    
    // Verify balance is exactly MinSum
    const userBalance = await instance.balances(user.address);
    expect(userBalance).to.equal(minSum);
    
    // User tries to collect 0.5 ether (less than balance, equal to MinSum)
    const collectAmount = ethers.parseEther("0.5");
    
    // This should succeed in original (>= MinSum) but revert in mutant (> MinSum)
    // If it reverts, mutant is detected
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});