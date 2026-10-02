import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m94a09245 - timestamp check removal", function () {
  it("should revert on second fallback call in same block due to timestamp check", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ether to allow transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("100")
    });

    // First call: should succeed (timestamp > pastBlockTime, which is 0 initially)
    const tx1 = await attacker.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call in the same block: should revert in original due to timestamp check
    // In mutant, this would succeed (no timestamp check) - we expect revert
    await expect(
      attacker.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});