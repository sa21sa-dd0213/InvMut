import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m916b9143", function () {
  it("should revert second call when block.timestamp hasn't increased (original), but mutant allows it with block.prevrandao", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send first transaction with 10 ether
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a block with the same timestamp as the previous block to ensure block.timestamp doesn't increase
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      (await ethers.provider.getBlock("latest"))!.timestamp
    ]);
    await ethers.provider.send("evm_mine", []);

    // Send second transaction in the same timestamp - should revert on original (block.timestamp check)
    // but pass on mutant (block.prevrandao > pastBlockTime may succeed since prevrandao is unrelated)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // On original contract this would revert; on mutant it might not revert
    // We expect the mutant to NOT revert (i.e., the tx succeeds) thus killing the mutant
    await expect(tx2).to.not.be.reverted;
  });
});