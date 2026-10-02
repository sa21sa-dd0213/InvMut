import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection - mbfd38045", function () {
  it("should allow withdrawal after deposit, but mutant with '<' condition will fail", async function () {
    const [owner, depositor] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const depositAmount = ethers.parseEther("1.0");
    
    // Deposit ether from depositor
    const depositTx = await instance.connect(depositor).deposit({ value: depositAmount });
    await depositTx.wait();
    
    // Record balances before withdrawal
    const depositorBalanceBefore = await ethers.provider.getBalance(depositor.address);
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);
    
    // Attempt withdrawal
    const withdrawTx = await instance.connect(depositor).withdrawAll();
    await withdrawTx.wait();
    
    // Check post-withdrawal state
    const depositorBalanceAfter = await ethers.provider.getBalance(depositor.address);
    const contractBalanceAfter = await ethers.provider.getBalance(instance.target);
    
    // Original contract: balance decreases, depositor receives funds
    // Mutant: condition fails (oCredit < 0 is false for positive credit), no transfer occurs
    expect(contractBalanceAfter).to.be.lessThan(contractBalanceBefore);
    expect(depositorBalanceAfter).to.be.greaterThan(depositorBalanceBefore);
  });
});