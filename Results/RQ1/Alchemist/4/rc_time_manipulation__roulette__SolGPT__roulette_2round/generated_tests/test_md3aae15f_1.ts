import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant md3aae15f test", function () {
  it("should kill the mutant by making two consecutive calls with increasing timestamps", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tenEther = ethers.parseEther("10");

    // First call - should succeed on both original and mutant
    let tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: tenEther
    });
    await tx.wait();

    // Wait for next block to ensure block.timestamp increases
    await ethers.provider.send("evm_mine", []);

    // Second call - should succeed on original (timestamp > pastBlockTime)
    // but fail on mutant (timestamp < pastBlockTime is false)
    tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: tenEther
    });

    // On original: passes; on mutant: reverts because timestamp > pastBlockTime
    await expect(tx).to.be.reverted;
  });
});