import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc21c3882 test", function () {
  it("should revert on second call with same block timestamp (original strict >) but mutant allows >=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Send first transaction with 10 ether
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
    });
    await tx1.wait();

    // Get the block timestamp of the first transaction
    const block1 = await ethers.provider.getBlock(tx1.blockNumber);
    const pastTimestamp = block1!.timestamp;

    // Mine a new block with the same timestamp (force same timestamp)
    await ethers.provider.send("evm_setNextBlockTimestamp", [pastTimestamp]);
    await ethers.provider.send("evm_mine");

    // Attempt second transaction with 10 ether at the same timestamp
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
    });

    // Original would revert (require(block.timestamp > pastBlockTime))
    // Mutant would succeed (require(block.timestamp >= pastBlockTime))
    // We expect revert to kill the mutant
    await expect(tx2).to.be.reverted;
  });
});