import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m277fac66", function () {
  it("should revert when sending exactly 10 ether due to mutated require condition", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether - should pass on original but fail on mutant
    // because mutant requires msg.value - 1 == 10 ether (i.e., 11 ether)
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx).to.be.reverted;
  });
});