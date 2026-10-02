import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6)", function () {
  it("should kill mutant mb0484ea7 by calling transfer with valid parameters and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner calls NETM() to set initial balances
    await (await instance.NETM()).wait();

    // Transfer some tokens from owner to addr1
    const transferAmount = ethers.parseEther("100");
    await expect(
      instance.connect(owner).transfer(addr1.address, transferAmount)
    ).to.not.be.reverted;
  });
});