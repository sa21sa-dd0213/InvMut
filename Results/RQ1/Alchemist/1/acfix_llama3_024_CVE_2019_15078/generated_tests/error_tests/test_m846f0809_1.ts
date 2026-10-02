import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m846f0809 test", function () {
  it("should revert when transferFrom exceeds allowance (kills mutant that removed allowance check)", async function () {
    const [owner, spender, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial distribution to owner
    const initialBalance = await instance.balanceOf(owner.address);
    expect(initialBalance).to.equal(ethers.parseEther("200000000"));

    // Owner approves spender for a small amount
    const approvedAmount = ethers.parseEther("100");
    await instance.connect(owner).approve(spender.address, approvedAmount);

    // Spender attempts to transfer more than the approved allowance
    const excessiveAmount = ethers.parseEther("200");
    
    // On original contract this would revert, on mutant it would succeed
    await expect(
      instance.connect(spender).transferFrom(owner.address, recipient.address, excessiveAmount)
    ).to.be.reverted;

    // Verify that no tokens were transferred (safety check)
    const recipientBalance = await instance.balanceOf(recipient.address);
    expect(recipientBalance).to.equal(0);
  });
});