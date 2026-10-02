import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant detection - onlyOwner modifier removal", function () {
  it("should revert when unauthorized address calls setOwner on original contract, but mutant would allow it", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call setOwner from an unauthorized address - should revert in original
    await expect(
      instance.connect(unauthorized).setOwner(unauthorized.address)
    ).to.be.reverted;

    // Verify owner remains unchanged after failed attempt
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(owner.address);
  });
});