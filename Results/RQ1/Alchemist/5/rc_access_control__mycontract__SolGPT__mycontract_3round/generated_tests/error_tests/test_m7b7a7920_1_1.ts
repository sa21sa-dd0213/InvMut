import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6)", function () {
  it("should revert when sending amount of 0, killing mutant m7b7a7920", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send 0 amount, which should revert in original but succeed in mutant
    await expect(
      instance.connect(owner).sendTo(addr1.address, 0)
    ).to.be.reverted;
  });
});