import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection - m129d5a48", function () {
  it("should revert when owner calls withdrawAll due to mutant != operator", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Owner calls withdrawAll - should succeed in original but fail in mutant
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.be.reverted;
  });
});