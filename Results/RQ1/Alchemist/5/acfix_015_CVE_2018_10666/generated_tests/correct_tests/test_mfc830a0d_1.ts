import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mfc830a0d by verifying owner is set to the provided address, not address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially, owner should be the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a non-zero address
    const newOwner = addr1.address;
    await instance.connect(owner).setOwner(newOwner);

    // Assert that owner is set to the provided address, not address(0)
    // The mutant sets owner to address(0), so this assertion will fail on the mutant
    expect(await instance.owner()).to.equal(newOwner);
  });
});