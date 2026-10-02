import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m151610e6 test", function () {
  it("should kill the mutant by verifying owner is set to deployer, not contract itself", async function () {
    const [owner, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");

    // Deploy with owner as the deployer's address
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether for withdrawal testing
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt withdrawAll from the deployer - should succeed in original, revert in mutant
    // because mutant sets owner to address(this) instead of the provided _owner
    const tx = instance.connect(owner).withdrawAll(recipient.address);

    // This will revert in the mutant because msg.sender (owner) != owner (which is contract address)
    await expect(tx).to.be.reverted;
  });
});