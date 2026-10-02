import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m66eeecdd test", function () {
  it("should revert when non-owner calls withdrawAll", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether for the test
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call withdrawAll from attacker (non-owner) - should revert in original, succeed in mutant
    await expect(
      instance.connect(attacker).withdrawAll()
    ).to.be.reverted;
  });
});