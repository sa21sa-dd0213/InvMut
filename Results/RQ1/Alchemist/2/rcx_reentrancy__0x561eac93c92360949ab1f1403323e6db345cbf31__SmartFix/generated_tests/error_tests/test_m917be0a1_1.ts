import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant test - m917be0a1 (&& replaced with ||)", function () {
  it("should revert when balance is >= _am but < MinSum (original behavior with &&)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required before operations)
    await instance.connect(owner).Initialized();
    
    // Set MinSum to 2 ether
    await instance.connect(owner).SetMinSum(ethers.parseEther("2"));
    
    // Deposit 1.5 ether to addr1 (balance >= _am but < MinSum)
    const depositAmount = ethers.parseEther("1.5");
    await instance.connect(addr1).Deposit({ value: depositAmount });
    
    // Try to collect 1 ether (balance >= 1 ether but 1.5 < 2 MinSum)
    const collectAmount = ethers.parseEther("1");
    
    // Original with && would revert because 1.5 < 2 (MinSum condition fails)
    // Mutant with || would succeed because 1.5 >= 1 (second condition passes)
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});