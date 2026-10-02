import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test - mbe1a19a1", function () {
  it("should revert when calling Put with positive msg.value on mutant (since mutant changes >= to <=)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Test case: call Put with 1 ether (positive msg.value)
    // The original contract allows this; the mutant (with <=) should revert
    const tx = instance.Put(0, { value: ethers.parseEther("1") });
    
    // Expect the transaction to be reverted on the mutant
    await expect(tx).to.be.reverted;
  });
});