import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m1567f955 - transferFrom state mutation", function () {
  it("should detect mutant that removes state updates from transferFrom", async function () {
    const [owner, spender, recipient] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed for XBORNID)
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balances and allowances
    const initialOwnerBalance = await instance.balanceOf(owner.address);
    const initialRecipientBalance = await instance.balanceOf(recipient.address);

    // Transfer some tokens to owner for testing (owner already has tokens from constructor)
    // First, approve spender to spend owner's tokens
    const approveAmount = ethers.parseEther("1000");
    await instance.connect(owner).approve(spender.address, approveAmount);

    // Verify allowance was set
    const allowance = await instance.allowance(owner.address, spender.address);
    expect(allowance).to.equal(approveAmount);

    // Perform transferFrom via spender
    const transferAmount = ethers.parseEther("500");
    const tx = await instance.connect(spender).transferFrom(owner.address, recipient.address, transferAmount);
    const receipt = await tx.wait();

    // Verify balances were updated (will fail on mutant since it doesn't update state)
    const finalOwnerBalance = await instance.balanceOf(owner.address);
    const finalRecipientBalance = await instance.balanceOf(recipient.address);

    expect(finalOwnerBalance).to.equal(initialOwnerBalance - transferAmount);
    expect(finalRecipientBalance).to.equal(initialRecipientBalance + transferAmount);

    // Verify allowance was reduced
    const finalAllowance = await instance.allowance(owner.address, spender.address);
    expect(finalAllowance).to.equal(approveAmount - transferAmount);

    // Verify Transfer event was emitted
    await expect(tx)
      .to.emit(instance, "Transfer")
      .withArgs(owner.address, recipient.address, transferAmount);
  });
});