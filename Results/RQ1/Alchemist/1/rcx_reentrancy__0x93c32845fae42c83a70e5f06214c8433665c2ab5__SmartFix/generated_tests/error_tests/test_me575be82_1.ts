import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - me575be82", function () {
  it("should kill the mutant by checking that Put with _unlockTime=0 allows immediate Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    const depositAmount = ethers.parseEther("2");
    
    // Call Put with _unlockTime=0 from addr1
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Immediately try to collect the full amount
    // In original: unlockTime = block.timestamp (current time), so collection should succeed
    // In mutant: unlockTime = block.prevrandao (unpredictable), collection likely fails
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.not.be.reverted;
  });
});