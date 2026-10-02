import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - mea289c12", function () {
  it("should kill mutant by calling setOwner from owner address and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // So when owner calls setOwner, it should revert in the mutant
    // In the original, it should succeed
    await expect(
      instance.connect(owner).setOwner(addr1.address)
    ).to.not.be.reverted;
  });
});