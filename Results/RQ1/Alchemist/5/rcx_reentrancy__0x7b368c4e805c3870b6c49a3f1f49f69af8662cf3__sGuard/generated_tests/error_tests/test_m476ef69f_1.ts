import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m476ef69f - Put operator flip", function () {
  it("should revert when Collect is called immediately after Put with past unlockTime (original behavior)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    const contractAddress = await instance.getAddress();
    
    // Send some initial balance to user for gas and deposit
    await owner.sendTransaction({
      to: user.address,
      value: ethers.parseEther("10")
    });
    
    // Call Put with unlockTime in the past (block.timestamp - 100 seconds)
    const pastUnlockTime = (await ethers.provider.getBlock("latest")).timestamp - 100;
    const depositAmount = ethers.parseEther("2");
    
    await instance.connect(user).Put(pastUnlockTime, { value: depositAmount });
    
    // Immediately try to Collect - should revert because unlockTime was set to block.timestamp (not past time)
    await expect(
      instance.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});