import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect mutant that adds +1 to balance on deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const depositAmount = ethers.parseEther("1.0");
    
    // Deposit exact amount from addr1
    const tx = await instance.connect(addr1).deposit({ value: depositAmount });
    await tx.wait();
    
    // Get the contract's internal balance state variable
    const contractBalance = await instance.balance();
    
    // In the original contract, balance should equal depositAmount
    // In the mutant, balance will be depositAmount + 1 wei
    expect(contractBalance).to.equal(depositAmount);
  });
});