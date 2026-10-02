import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - block.prevrandao vs block.timestamp", function () {
  it("should revert when calling fallback twice in the same block, but mutant allows second call", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with exactly 10 ether for the first call
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First call should succeed
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Second call in the same block should revert in original, but succeed in mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});