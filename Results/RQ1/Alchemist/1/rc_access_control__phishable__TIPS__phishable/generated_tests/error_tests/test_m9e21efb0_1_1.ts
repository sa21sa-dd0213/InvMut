import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant test - m9e21efb0", function () {
  it("should kill the mutant by verifying owner is set correctly after deployment", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with a specific non-zero owner address
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Check that owner is the provided address (not address(0) as in the mutant)
    const storedOwner = await instance.owner();
    expect(storedOwner).to.equal(owner.address);

    // Attempt to call withdrawAll from the intended owner address
    // In the original, this should succeed; in the mutant (owner = address(0)), it will revert
    const tx = instance.connect(owner).withdrawAll(addr1.address);
    await expect(tx).to.not.be.reverted;
  });
});