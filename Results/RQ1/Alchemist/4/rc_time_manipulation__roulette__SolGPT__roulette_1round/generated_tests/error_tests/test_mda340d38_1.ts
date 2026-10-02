import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mda340d38 - conditional replacement", function () {
  it("should not send balance when block.number is not divisible by 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // Ensure we are on a block where block.number % 15 != 0
    const currentBlock = await ethers.provider.getBlock("latest");
    let targetBlock = currentBlock.number + 1;
    // Mine blocks until block.number % 15 != 0
    while (targetBlock % 15 === 0) {
      await ethers.provider.send("evm_mine", []);
      targetBlock++;
    }

    // Get balance before
    const balanceBefore = await ethers.provider.getBalance(instance.target);

    // Send 10 ether from addr1 (which triggers fallback)
    const tx = await addr1.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Balance should remain unchanged (no payout)
    const balanceAfter = await ethers.provider.getBalance(instance.target);
    expect(balanceAfter).to.equal(balanceBefore.add(ethers.parseEther("10")));
  });
});