import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant mb4b20593 detection", function () {
  it("should revert when Collect fails due to recipient contract rejecting ether", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the main contract
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious contract that rejects ether
    const Rejector = await ethers.getContractFactory("RejectEther");
    const rejector = await Rejector.deploy();
    await rejector.waitForDeployment();
    
    // Setup: initialize contract, set min sum, fund the contract
    const minSum = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2");
    
    await instance.connect(owner).SetMinSum(minSum);
    await instance.connect(owner).SetLogFile(owner.address); // dummy log address
    await instance.connect(owner).Initialized();
    
    // Fund the contract through addr1
    await instance.connect(addr1).Put(depositAmount, { value: depositAmount });
    
    // Advance time to make unlockTime pass
    await ethers.provider.send("evm_increaseTime", [3600 * 24 * 365]); // 1 year
    await ethers.provider.send("evm_mine", []);
    
    // Try to collect from addr1, but send to rejector contract
    // This should revert because the rejector rejects ether
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});