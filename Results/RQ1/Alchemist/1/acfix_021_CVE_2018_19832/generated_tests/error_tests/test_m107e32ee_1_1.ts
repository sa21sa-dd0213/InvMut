import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when transferring to address(0) - kills mutant m107e32ee", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, give addr1 some tokens to transfer
    await instance.connect(owner).NETM();

    // Transfer some tokens to addr1 for testing
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);

    // Attempt to transfer from addr1 to address(0) - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).transfer(ethers.ZeroAddress, transferAmount)
    ).to.be.reverted;
  });
});