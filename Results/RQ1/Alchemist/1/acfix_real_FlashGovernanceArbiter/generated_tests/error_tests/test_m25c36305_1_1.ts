import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m25c36305", function () {
  it("should revert when setGoverned is called with arrays of different lengths", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy FlashGovernanceArbiter with a DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Create arrays of different lengths
    const governables = [addr1.address]; // 1 element
    const isGoverned: boolean[] = [true, false]; // 2 elements - different length

    // Call setGoverned with mismatched array lengths
    // This should revert on the original contract due to the length check
    // The mutant removes this check, so it would not revert
    await expect(
      instance.connect(owner).setGoverned(governables, isGoverned)
    ).to.be.revertedWith("LIMBO: length mismatch");
  });
});