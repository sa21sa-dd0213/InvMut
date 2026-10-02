import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - timestamp comparison", function () {
  it("should revert on second call when mutant uses < instead of >", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: should succeed (sets pastBlockTime)
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Wait a moment to ensure block.timestamp advances
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Second call: in original contract this would succeed (timestamp > pastBlockTime)
    // In mutant, this should revert because timestamp < pastBlockTime is false
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});