import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection - constructor owner set to address(this)", function () {
  it("should fail on mutant because owner becomes contract itself instead of the supplied address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    
    // Deploy with owner as the supplied address (owner)
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether for withdrawal testing
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // The owner should be able to withdraw - in the original, this works.
    // In the mutant, owner is address(this) so the call from owner.address will revert.
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.be.reverted;
  });
});