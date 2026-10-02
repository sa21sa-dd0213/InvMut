import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - kill md3aae15f", function () {
  it("should kill mutant by calling fallback twice - second call should revert when timestamp check is inverted", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: send 10 ether, should succeed on both original and mutant
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Wait for block timestamp to advance
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Second call: send 10 ether, should succeed on original but revert on mutant
    // because mutant requires block.timestamp < pastBlockTime, which is impossible
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});