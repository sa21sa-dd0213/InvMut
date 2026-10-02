import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Roulette mutant detection - block.prevrandao replacement", function () {
  it("should revert on second call within same block due to timestamp check, but mutant may allow it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether so transfers can happen
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First call - should succeed in both original and mutant
    const tx1 = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call in the same block - original reverts (block.timestamp not > pastBlockTime)
    // Mutant may succeed because block.prevrandao can be equal or greater
    const tx2 = addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // If the call does NOT revert, the mutant is killed (original would revert)
    // We expect revert on original, so we assert revert - if it passes (no revert), the test fails, detecting the mutant
    await expect(tx2).to.be.reverted;
  });
});