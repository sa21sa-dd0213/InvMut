import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant m1b16d27a detection", function () {
  it("should revert when non-owner calls onlyOwner function, but original allows owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test: Owner should be able to call setOwner without revert
    // In the mutant, require(msg.sender != owner) will cause a revert when owner calls
    await expect(
      instance.connect(owner).setOwner(addr1.address)
    ).to.not.be.reverted;

    // Verify the owner was actually changed (original behavior)
    expect(await instance.owner()).to.equal(addr1.address);
  });
});