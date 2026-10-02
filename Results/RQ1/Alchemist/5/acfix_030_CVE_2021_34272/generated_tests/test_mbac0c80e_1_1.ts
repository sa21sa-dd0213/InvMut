import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner tries to transfer ownership (detect mutant removing onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Try to transfer ownership from non-owner address - should revert on original, pass on mutant
    await expect(
      instance.connect(addr1).transferOwnership(addr1.address)
    ).to.be.revertedWith(""); // Expect revert due to onlyOwner modifier
  });
});