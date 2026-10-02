import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant kill test - mde2573f5", function () {
  it("should kill the mutant by verifying that deployer is NOT the owner when constructor sets owner to address(this)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Verify the owner is the contract itself (mutant behavior), not the deployer
    const contractOwner = await instance.owner();
    expect(contractOwner).to.equal(await instance.getAddress());

    // Attempt withdrawAll from deployer - should revert because deployer is not owner
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.be.reverted;
  });
});