import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m9f6a4ce3 test", function () {
  it("should revert when non-owner calls withdrawAll on original, but succeed on mutant (kills mutant)", async function () {
    const [owner, nonOwner, recipient] = await ethers.getSigners();

    // Deploy contract with owner as the initial owner
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call withdrawAll from a non-owner address
    // On the original contract this should revert
    // On the mutant (which removes the require check) it will succeed
    await expect(
      instance.connect(nonOwner).withdrawAll(recipient.address)
    ).to.be.reverted;
  });
});