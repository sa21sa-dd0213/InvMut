import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - transferFrom mutant kill test", function () {
  it("should kill mutant m0c0934c9 by verifying sender balance decreases on transferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balances
    const initialOwnerBalance = await instance.balanceOf(owner.address);
    const initialAddr1Balance = await instance.balanceOf(addr1.address);
    const initialAddr2Balance = await instance.balanceOf(addr2.address);

    // Owner needs tokens to transfer, so we need to distribute some first
    // The getTokens() function distributes tokens, but requires not blacklisted and distribution not finished
    // Let's first check if distribution is finished and set blacklist accordingly
    const isDistributionFinished = await instance.distributionFinished();
    if (!isDistributionFinished) {
      // Get tokens for owner first
      await instance.connect(owner).getTokens({ value: 0 });
    }

    // Now owner has tokens, approve addr1 to spend tokens
    const ownerBalance = await instance.balanceOf(owner.address);
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).approve(addr1.address, transferAmount);

    // addr1 transfers tokens from owner to addr2 using transferFrom
    const tx = await instance.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
    await tx.wait();

    // Check balances after transfer
    const finalOwnerBalance = await instance.balanceOf(owner.address);
    const finalAddr2Balance = await instance.balanceOf(addr2.address);

    // In original: owner balance should decrease by transferAmount
    // In mutant: owner balance would increase by transferAmount (wrong)
    expect(finalOwnerBalance).to.equal(ownerBalance - transferAmount);
    expect(finalAddr2Balance).to.equal(initialAddr2Balance + transferAmount);
  });
});