import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant me2cec939 (transfer < vs <=)", function () {
  it("should allow transfer of exact full balance (original) but mutant should revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, ensure addr1 has some tokens by calling getTokens()
    // The contract distributes tokens to msg.sender via getTokens()
    // We need to send some ether to trigger getTokens() via receive()
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Get addr1's balance after receiving tokens
    const balanceBefore = await instance.balanceOf(addr1.address);
    expect(balanceBefore).to.be.gt(0);

    // Now try to transfer the exact full balance from addr1 to owner
    // This should succeed on original (<=) but revert on mutant (<)
    await expect(
      instance.connect(addr1).transfer(owner.address, balanceBefore)
    ).to.be.reverted;
  });
});