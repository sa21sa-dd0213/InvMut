import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO - Kill mutant mac3bc81d (if false)", function () {
  it("should allow withdrawal after deposit - mutant replaces condition with false, so withdrawal fails silently", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get initial balances
    const initialUserBalance = await ethers.provider.getBalance(user.address);
    const depositAmount = ethers.parseEther("1.0");
    
    // User deposits 1 ETH
    const depositTx = await instance.connect(user).deposit({ value: depositAmount });
    await depositTx.wait();
    
    // User calls withdrawAll
    const withdrawTx = await instance.connect(user).withdrawAll();
    await withdrawTx.wait();
    
    // Check final balances
    const finalUserBalance = await ethers.provider.getBalance(user.address);
    const contractBalance = await ethers.provider.getBalance(instance.target);
    
    // On original: user balance increases by ~1 ETH (minus gas), contract balance becomes 0
    // On mutant: user balance remains same, contract still holds 1 ETH
    // We verify the contract balance is 0, which will fail on mutant
    expect(contractBalance).to.equal(0);
    
    // Also verify user received the funds (within gas costs)
    const gasCost = (await withdrawTx.wait()).gasUsed * (await withdrawTx.gasPrice);
    const expectedUserBalance = initialUserBalance + depositAmount - gasCost;
    expect(finalUserBalance).to.equal(expectedUserBalance);
  });
});