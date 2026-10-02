import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when amount is zero on original, but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send 0 amount - should revert on original, pass on mutant
    await expect(
      instance.connect(owner).sendTo(addr1.address, 0)
    ).to.be.reverted;
  });
});