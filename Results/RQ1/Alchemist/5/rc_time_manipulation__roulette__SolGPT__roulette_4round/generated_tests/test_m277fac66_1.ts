import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - kill m277fac66", function () {
  it("should succeed with exactly 10 ether on original, but mutant would revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to the fallback function
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The original contract should accept this (no revert), but the mutant
    // requires msg.value-1 == 10 ether (i.e., msg.value == 11 ether) and will revert.
    // If the mutant is deployed, this expect will catch the revert.
    await expect(tx).to.not.be.reverted;
  });
});