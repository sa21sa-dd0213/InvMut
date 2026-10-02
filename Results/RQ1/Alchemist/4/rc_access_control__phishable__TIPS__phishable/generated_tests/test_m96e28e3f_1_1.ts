import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant test - m96e28e3f", function () {
  it("should revert when owner calls withdrawAll after mutant changes == to !=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Send some ether to the contract so there is balance to withdraw
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Owner calls withdrawAll - should succeed on original, fail on mutant
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.be.reverted;
  });
});