import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - Kill mutant m3a640fa3 (missing Transfer event in transferFrom)", function () {
  it("should emit Transfer event when transferFrom is called", async function () {
    const [owner, spender, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, give owner some tokens via the distribution mechanism
    // The constructor sets balances[owner] = totalDistributed (200000000e18)
    // We need to approve spender to spend owner's tokens
    const approveAmount = ethers.parseEther("1000");
    await instance.connect(owner).approve(spender.address, approveAmount);

    // Now transferFrom from owner to recipient using spender
    const transferAmount = ethers.parseEther("500");
    const tx = await instance.connect(spender).transferFrom(owner.address, recipient.address, transferAmount);
    const receipt = await tx.wait();

    // Check that Transfer event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Transfer")
      .withArgs(owner.address, recipient.address, transferAmount);
  });
});