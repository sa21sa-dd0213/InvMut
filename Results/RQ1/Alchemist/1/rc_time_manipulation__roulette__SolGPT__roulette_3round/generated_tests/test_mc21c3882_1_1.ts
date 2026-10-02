import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mc21c3882", function () {
  it("should kill the mutant by submitting two transactions in the same second", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether so the first call can succeed
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First transaction: should succeed (sets pastBlockTime to block.timestamp + 1)
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a block with the same timestamp as the first transaction
    const block1 = await ethers.provider.getBlock(tx1.blockNumber!);
    await ethers.provider.send("evm_setNextBlockTimestamp", [block1!.timestamp]);

    // Second transaction in the same timestamp: should revert on original, but pass on mutant
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // On the original contract this would revert; on the mutant it would succeed
    // We expect revert to kill the mutant (mutant would not revert)
    await expect(tx2).to.be.reverted;
  });
});