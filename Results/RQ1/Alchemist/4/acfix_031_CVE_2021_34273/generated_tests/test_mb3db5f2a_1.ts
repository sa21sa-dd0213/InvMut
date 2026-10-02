import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner tries to transfer ownership (mutant removal of onlyOwner modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially owner is the deployer (owner)
    expect(await instance.owner()).to.equal(owner.address);

    // Non-owner (addr1) attempts to transfer ownership to addr2
    // In the original contract, this should revert due to onlyOwner modifier
    // In the mutant (missing modifier), the call will succeed and change the owner
    await expect(
      instance.connect(addr1).transferOwnership(addr2.address)
    ).to.be.reverted;

    // Verify owner has not changed (mutant would have changed it, failing this assertion)
    expect(await instance.owner()).to.equal(owner.address);
  });
});