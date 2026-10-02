import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - md3aae15f", function () {
  it("should kill the mutant by expecting revert when timestamp has advanced", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // First call: succeeds in both original and mutant
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Wait for timestamp to advance (at least 1 second)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine");

    // Second call: should succeed in original (block.timestamp > pastBlockTime)
    // but should REVERT in mutant (block.timestamp < pastBlockTime is false)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});