import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant maec7a2dc", function () {
  it("should kill mutant by deploying with a valid owner and then calling withdrawAll from that owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Try to withdraw from the owner address - should succeed in original, but fail in mutant
    // because mutant sets owner to address(0) instead of owner.address
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.be.reverted;
  });
});