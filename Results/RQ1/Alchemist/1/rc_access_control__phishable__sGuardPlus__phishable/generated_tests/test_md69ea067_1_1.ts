import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection test", function () {
  it("should kill the mutant by verifying owner is set to the provided address, not the contract itself", async function () {
    const [owner, otherAccount] = await ethers.getSigners();

    // Deploy with owner as the first signer
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Attempt to withdrawAll from the owner address - should succeed on original
    // but fail on mutant because owner is set to contract address (address(this))
    const tx = instance.connect(owner).withdrawAll(otherAccount.address);

    // On original: succeeds (owner == msg.sender)
    // On mutant: reverts because owner == address(this) != msg.sender
    await expect(tx).to.be.reverted;
  });
});