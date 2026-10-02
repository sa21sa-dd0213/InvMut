import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - mea289c12", function () {
  it("should revert when owner calls setOwner because modifier uses !=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original contract, owner can call setOwner successfully.
    // In the mutant, require(msg.sender != owner) will fail for the owner,
    // so the call should revert.
    await expect(
      instance.connect(owner).setOwner(addr1.address)
    ).to.be.reverted;
  });
});