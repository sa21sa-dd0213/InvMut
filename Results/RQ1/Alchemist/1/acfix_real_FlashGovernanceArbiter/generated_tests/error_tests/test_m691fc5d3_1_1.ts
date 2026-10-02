import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant m691fc5d3", function () {
  it("should succeed when calling setGoverned with non-empty array (mutant would revert due to out-of-bounds)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock DAO that satisfies the interface required by FlashGovernanceArbiter
    const MockDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();

    // Deploy FlashGovernanceArbiter with the mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();

    // Make the owner a successful proposal sender so we can call onlySuccessfulProposal functions
    await mockDAO.setSuccessfulProposal(owner.address, true);

    // Prepare arrays for setGoverned call
    const governables = [addr1.address, addr2.address];
    const isGoverned = [true, false];

    // Original contract: this call succeeds
    // Mutant: reverts due to out-of-bounds access when i == governables.length
    await expect(
      instance.connect(owner).setGoverned(governables, isGoverned)
    ).to.not.be.reverted;

    // Verify that the mapping was correctly updated for both entries
    expect(await instance.governed(addr1.address)).to.equal(true);
    expect(await instance.governed(addr2.address)).to.equal(false);
  });
});