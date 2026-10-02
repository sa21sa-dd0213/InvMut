import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection - withdrawAll with != instead of ==", function () {
  it("should revert when called by owner on mutant (because != blocks owner)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract so transfer has balance to send
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });
    await fundTx.wait();

    // The mutant requires msg.sender != owner, so owner calling should revert
    await expect(
      instance.connect(owner).withdrawAll(attacker.address)
    ).to.be.reverted;
  });
});