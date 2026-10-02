import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls transferOwnership (detects removal of require in onlyOwner modifier)", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call transferOwnership from a non-owner address
    await expect(
      instance.connect(nonOwner).transferOwnership(nonOwner.address)
    ).to.be.reverted;

    // Verify that owner was NOT changed (original owner still owns the contract)
    expect(await instance.owner()).to.equal(owner.address);
  });
});