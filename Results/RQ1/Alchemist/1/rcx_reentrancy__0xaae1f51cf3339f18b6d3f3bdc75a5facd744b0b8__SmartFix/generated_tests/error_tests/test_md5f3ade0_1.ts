import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant test - Deposit extra 1 wei", function () {
  it("should kill mutant by verifying exact balance after depositing 1 wei", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DEP_BANK - no constructor arguments
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required before deposits work)
    await instance.connect(owner).Initialized();
    
    // Deposit exactly 1 wei from addr1
    const depositAmount = ethers.parseEther("0"); // 0 ether
    const tx = await instance.connect(addr1).Deposit({ value: 1 });
    await tx.wait();
    
    // Check balance: should be exactly 1 wei (not 2 wei)
    const balance = await instance.balances(addr1.address);
    expect(balance).to.equal(1);
  });
});