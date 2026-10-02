import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - m277fac66", function () {
  it("should revert when sending 10 ether because mutant requires 11 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to trigger fallback - should pass on original but fail on mutant
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
    });

    await expect(tx).to.be.reverted;
  });
});