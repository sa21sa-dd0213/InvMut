import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - timestamp comparison", function () {
  it("should kill the mutant by sending two consecutive transactions and expecting the second to succeed (original) vs revert (mutant)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tenEther = ethers.parseEther("10");

    // First transaction - should succeed on both original and mutant
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: tenEther
    });
    await tx1.wait();

    // Mine a new block to ensure timestamp changes
    await ethers.provider.send("evm_mine", []);

    // Second transaction - mine in a new block (ensuring timestamp >= previous)
    // On original: block.timestamp > pastBlockTime → succeeds
    // On mutant: block.timestamp < pastBlockTime → reverts
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: tenEther
      })
    ).to.not.be.reverted;
  });
});