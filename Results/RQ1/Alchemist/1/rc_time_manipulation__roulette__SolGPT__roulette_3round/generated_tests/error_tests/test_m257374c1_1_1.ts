import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m257374c1", function () {
  it("should not transfer balance when block.number % 15 != 0 (mutant incorrectly transfers)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 10 ether to the contract
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get current block number and ensure it's NOT a multiple of 15
    let blockNum = await ethers.provider.getBlockNumber();
    if (blockNum % 15 === 0) {
      // Mine one more block to avoid the edge case where block.number % 15 == 0
      await ethers.provider.send("evm_mine", []);
      blockNum = await ethers.provider.getBlockNumber();
    }

    // Record contract balance
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Trigger fallback again with 10 ether (this will also set pastBlockTime)
    const tx2 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx2.wait();

    // Get balance after
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // In the original contract, no transfer should happen because block.number % 15 != 0
    // The mutant incorrectly transfers, so the balance would drop to near zero
    // We assert that balanceAfter >= balanceBefore (original behavior) - mutant will fail here
    expect(balanceAfter).to.equal(balanceBefore + ethers.parseEther("10"));
  });
});