import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant detection - modifier onlyOwner removal", function () {
  it("should revert when non-owner calls transferOwnership (kills mutant without require check)", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call transferOwnership from a non-owner address
    // Original contract reverts because onlyOwner modifier requires msg.sender == owner
    // Mutant (without the require) would not revert, so this test kills it
    await expect(
      instance.connect(nonOwner).transferOwnership(nonOwner.address)
    ).to.be.reverted;
  });
});