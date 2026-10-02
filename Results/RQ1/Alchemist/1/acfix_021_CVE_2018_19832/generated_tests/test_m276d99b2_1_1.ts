import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m276d99b2 by transferring more than approved allowance in transferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: owner has tokens from NETM() call
    await instance.NETM();

    // Owner approves addr1 to spend 100 tokens
    const approveAmount = ethers.parseEther("100");
    await instance.approve(addr1.address, approveAmount);

    // Attempt to transferFrom more than approved amount (200 tokens)
    const transferAmount = ethers.parseEther("200");
    await expect(
      instance.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
    ).to.be.reverted;
  });
});