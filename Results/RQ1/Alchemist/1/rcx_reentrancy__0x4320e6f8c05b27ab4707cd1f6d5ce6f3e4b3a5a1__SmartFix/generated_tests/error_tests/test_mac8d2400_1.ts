import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant kill test - mac8d2400", function () {
  it("should allow Collect when balance is greater than withdrawal amount (original behavior), but mutant reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.connect(owner).Initialized();
    
    // Deposit 10 ether into addr1's balance
    const depositAmount = ethers.parseEther("10");
    await instance.connect(addr1).deposit({ value: depositAmount });
    
    // Set MinSum to 1 ether so that the first condition (balance >= MinSum) is satisfied
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));
    
    // Attempt to Collect 5 ether (balance 10 > 5, so original >= passes, mutant <= fails)
    const collectAmount = ethers.parseEther("5");
    
    // This should revert on the mutant because balance (10) is NOT <= _am (5)
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});