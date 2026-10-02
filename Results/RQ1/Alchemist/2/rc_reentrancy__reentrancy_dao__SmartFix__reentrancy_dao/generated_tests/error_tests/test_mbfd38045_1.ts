import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection - mbfd38045", function () {
  it("should detect mutant that changes > to < in withdrawAll condition", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // User deposits 1 ETH
    await instance.connect(user).deposit({ value: depositAmount });
    
    // Verify credit was recorded
    expect(await instance.credit(user.address)).to.equal(depositAmount);
    
    // Get initial balances
    const initialUserBalance = await ethers.provider.getBalance(user.address);
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    
    // User attempts to withdraw all
    const tx = await instance.connect(user).withdrawAll();
    await tx.wait();
    
    // In original: withdrawal succeeds, credit becomes 0, user receives ETH
    // In mutant: condition oCredit < 0 is false (since oCredit = 1), so nothing happens
    
    // Check that credit was reset to 0 (original behavior) vs remained 1 (mutant behavior)
    const finalCredit = await instance.credit(user.address);
    expect(finalCredit).to.equal(0); // This assertion will fail on the mutant
    
    // Verify user received the ETH (original behavior)
    const finalUserBalance = await ethers.provider.getBalance(user.address);
    const finalContractBalance = await ethers.provider.getBalance(instance.target);
    
    // User should have received the deposit minus gas costs
    expect(finalUserBalance - initialUserBalance + (await tx.gasPrice * tx.gasLimit)).to.equal(depositAmount);
    
    // Contract balance should have decreased by deposit amount
    expect(initialContractBalance - finalContractBalance).to.equal(depositAmount);
  });
});