import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - md954df0d", function () {
  it("should kill the mutant by depositing and then withdrawing, expecting balance transfer and credit reset", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // Deposit ether
    await instance.connect(owner).deposit({ value: depositAmount });
    
    // Check initial credit
    const initialCredit = await instance.credit(owner.address);
    expect(initialCredit).to.equal(depositAmount);
    
    // Get initial balance of owner
    const initialBalance = await ethers.provider.getBalance(owner.address);
    
    // Call withdrawAll
    const tx = await instance.connect(owner).withdrawAll();
    const receipt = await tx.wait();
    
    // Calculate gas cost
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    
    // Check that owner received the deposited ether (minus gas)
    const finalBalance = await ethers.provider.getBalance(owner.address);
    expect(finalBalance).to.equal(initialBalance + depositAmount - gasCost);
    
    // Check that credit was reset to zero
    const finalCredit = await instance.credit(owner.address);
    expect(finalCredit).to.equal(0);
    
    // Check contract balance is zero
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(0);
  });
});