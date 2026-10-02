import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - kill mutant m91e99ff7 (transferFrom allowance division)", function () {
  it("should correctly subtract allowance in transferFrom, not divide it", async function () {
    const [owner, spender, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balances and setup
    const initialSupply = ethers.parseEther("500000000");
    const distributeAmount = ethers.parseEther("1000");
    
    // Owner distributes tokens to himself (since constructor sets owner balance)
    // First, get some tokens to transfer
    await instance.connect(owner).getTokens();

    // Approve spender to use 100 tokens from owner
    const approveAmount = ethers.parseEther("100");
    await instance.connect(owner).approve(spender.address, approveAmount);

    // Verify allowance is set correctly
    let allowance = await instance.allowance(owner.address, spender.address);
    expect(allowance).to.equal(approveAmount);

    // Transfer 10 tokens from owner to recipient using spender
    const transferAmount = ethers.parseEther("10");
    await instance.connect(spender).transferFrom(owner.address, recipient.address, transferAmount);

    // Check allowance after transfer - should be 90 (100 - 10), not 10 (100 / 10)
    allowance = await instance.allowance(owner.address, spender.address);
    const expectedAllowance = ethers.parseEther("90");

    // This assertion will pass on original (subtraction) but fail on mutant (division)
    expect(allowance).to.equal(expectedAllowance);

    // Also verify the transfer actually happened
    const recipientBalance = await instance.balanceOf(recipient.address);
    expect(recipientBalance).to.equal(transferAmount);
  });
});