import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m94a09245", function () {
  it("should kill mutant by calling fallback twice in rapid succession (second call should revert on original but pass on mutant)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: send 10 ether to trigger fallback
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call: attempt immediately after first (same second)
    // On original contract this should revert due to timestamp check
    // On mutant it will succeed (killing the mutant)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx2).to.be.reverted;
  });
});