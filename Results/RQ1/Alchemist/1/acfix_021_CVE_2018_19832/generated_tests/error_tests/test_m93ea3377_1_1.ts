import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant m93ea3377", function () {
  it("should emit Transfer event when transferFrom is called", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, distribute tokens to addr1 so they have a balance to transfer from
    // Call getTokens() from addr1 to get initial distribution
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });

    // Get the balance of addr1
    const balanceAddr1 = await instance.balanceOf(addr1.address);
    expect(balanceAddr1).to.be.gt(0);

    // Approve owner to spend tokens from addr1
    await instance.connect(addr1).approve(owner.address, balanceAddr1);

    // Perform transferFrom: owner transfers from addr1 to addr2
    const amountToTransfer = balanceAddr1 / 2n;
    const tx = await instance.connect(owner).transferFrom(addr1.address, addr2.address, amountToTransfer);

    // Expect the Transfer event to be emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Transfer")
      .withArgs(addr1.address, addr2.address, amountToTransfer);
  });
});