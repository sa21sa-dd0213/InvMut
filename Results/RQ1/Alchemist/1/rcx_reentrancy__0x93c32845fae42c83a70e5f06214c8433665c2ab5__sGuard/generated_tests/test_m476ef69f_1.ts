import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test - m476ef69f", function () {
  it("should revert when trying to collect immediately after depositing with a future unlock time", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Set a future unlock time (e.g., 1 hour from now)
    const futureTime = Math.floor(Date.now() / 1000) + 3600;
    
    // Deposit funds with future unlock time
    const depositAmount = ethers.parseEther("2.0");
    await instance.connect(addr1).Put(futureTime, { value: depositAmount });
    
    // Try to collect immediately - should revert because unlock time is in the future
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});