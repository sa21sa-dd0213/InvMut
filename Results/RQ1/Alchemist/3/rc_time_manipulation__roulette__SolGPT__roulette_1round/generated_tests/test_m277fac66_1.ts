import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m277fac66", function () {
  it("should revert when sending exactly 10 ether to the mutated fallback", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether - should succeed on original but revert on mutant
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx).to.be.reverted;
  });
});