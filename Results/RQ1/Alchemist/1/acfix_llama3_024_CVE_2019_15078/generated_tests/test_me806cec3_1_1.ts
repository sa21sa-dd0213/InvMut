import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant me806cec3 - transferFrom allowance check", function () {
  it("should detect mutant where _amount == allowed[_from][msg.sender] replaces _amount <= allowed[_from][msg.sender]", async function () {
    const [owner, spender, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the initial distribution to owner
    const totalDistributed = await instance.totalDistributed();
    // Owner has totalDistributed tokens initially (from constructor logic)

    // Approve spender for 100 tokens
    const approveAmount = ethers.parseEther("100");
    await instance.connect(owner).approve(spender.address, approveAmount);

    // Verify allowance is set
    expect(await instance.allowance(owner.address, spender.address)).to.equal(approveAmount);

    // Attempt transferFrom with amount less than allowance (e.g., 50 tokens)
    const transferAmount = ethers.parseEther("50");

    // On original contract this should succeed; on mutant it should revert
    // because mutant requires _amount == allowed[_from][msg.sender] (exact match)
    if (await instance.allowance(owner.address, spender.address) === transferAmount) {
      // Edge case: if allowance equals transfer amount, test is inconclusive
      // But we set allowance to 100 and transfer 50, so they differ
    }

    await expect(
      instance.connect(spender).transferFrom(owner.address, recipient.address, transferAmount)
    ).to.be.reverted;
  });
});