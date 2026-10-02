import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when calling sendTo with a positive amount (mutant changes > to <)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(amount > 0) to require(amount < 0)
    // A positive amount (e.g., 1 wei) should succeed in the original but revert in the mutant
    await expect(
      instance.connect(owner).sendTo(addr1.address, 1)
    ).to.be.reverted;
  });
});