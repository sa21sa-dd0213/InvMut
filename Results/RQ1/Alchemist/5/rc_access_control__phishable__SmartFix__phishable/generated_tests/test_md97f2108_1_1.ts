import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant md97f2108 test", function () {
  it("should kill the mutant by verifying owner is set to constructor argument, not contract address", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with owner as the first signer
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Get the contract's own address
    const contractAddress = await instance.getAddress();

    // In the original, owner should be owner.address
    // In the mutant, owner would be contractAddress
    const storedOwner = await instance.owner();

    // Verify owner is set to the constructor argument (original behavior)
    expect(storedOwner).to.equal(owner.address);

    // Now attempt to withdrawAll from owner's address
    // In original: should succeed
    // In mutant: will revert because owner == contractAddress, not owner.address
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.not.be.reverted;

    // Additional kill: verify that contract itself cannot withdraw (mutant would allow this)
    // In mutant, contract is owner, so calling from contract would work
    // But we can't call from contract directly in Hardhat, so we check the revert case
    await expect(
      instance.connect(addr1).withdrawAll(addr1.address)
    ).to.be.reverted;
  });
});