import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mc21c3882", function () {
  it("should revert when calling fallback with same timestamp (strictly greater required)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send first transaction with 10 ETH to set pastBlockTime
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Get the block timestamp of the first transaction
    const block1 = await ethers.provider.getBlock(tx1.blockNumber);
    const firstTimestamp = block1!.timestamp;

    // Mine a new block with the same timestamp to force equal timestamps
    await ethers.provider.send("evm_setNextBlockTimestamp", [firstTimestamp]);
    
    // Send second transaction in a block with same timestamp
    // Original contract would revert (requires >), mutant would accept (>=)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The original contract reverts, so we expect revert
    await expect(tx2).to.be.reverted;
  });
});