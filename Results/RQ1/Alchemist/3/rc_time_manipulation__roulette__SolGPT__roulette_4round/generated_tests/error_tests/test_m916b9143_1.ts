import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Roulette mutant m916b9143 - block.prevrandao vs block.timestamp", function () {
  it("should revert when calling fallback twice in the same block (block.prevrandao cannot enforce time ordering)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ETH so the first call succeeds
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First call: should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call in the same block: should revert in original (block.timestamp check)
    // but may pass in mutant (block.prevrandao may not increase)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});