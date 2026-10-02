import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sending zero amount (kills mutant that removes require(amount > 0))", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send zero amount - should revert on original, succeed on mutant
    await expect(
      instance.connect(owner).sendTo(addr1.address, 0)
    ).to.be.reverted;
  });
});