import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls transferOwnership (kill mutant mbac0c80e)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Try to transfer ownership from a non-owner address - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).transferOwnership(addr1.address)
    ).to.be.reverted;
  });
});