import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant kill test - m70366a19", function () {
  it("should revert when collecting exact balance amount (mutant uses > instead of >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Set MinSum to 0 to simplify testing (optional, but helpful)
    // Note: MinSum is 1 ether by default, so we need to deposit at least 1 ether
    
    // Deposit exactly 2 ether from addr1
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Try to collect exactly the deposited amount (should fail on mutant because balance == _am)
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted; // Mutant rejects when balance == _am, original accepts
    
    // Verify balance remains unchanged (mutant didn't allow the collect)
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
  });
  
  it("should succeed when collecting less than balance (both original and mutant work)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Deposit 2 ether
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Collect 1 ether (less than balance - should work on both)
    const collectAmount = ethers.parseEther("1");
    await instance.connect(addr1).Collect(collectAmount);
    
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(ethers.parseEther("1"));
  });
});