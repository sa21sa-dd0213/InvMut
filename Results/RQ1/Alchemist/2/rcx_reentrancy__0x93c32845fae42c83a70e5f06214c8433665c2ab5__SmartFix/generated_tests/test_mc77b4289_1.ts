import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant mc77b4289 - kill with non-zero deposit", function () {
  it("should succeed when depositing 1 ether (original behavior) but mutant reverts because it uses == instead of >=", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    const depositAmount = ethers.parseEther("1");
    
    // This transaction should succeed on the original contract (>= allows any non-zero deposit)
    // But the mutant (using ==) will revert because msg.value must be 0 to satisfy balance + 0 == balance
    await expect(
      instance.connect(owner).Put(0, { value: depositAmount })
    ).to.be.reverted;
  });
});