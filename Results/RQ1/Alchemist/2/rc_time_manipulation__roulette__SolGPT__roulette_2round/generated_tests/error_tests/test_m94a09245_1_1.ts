import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m94a09245 test", function () {
  it("should revert when calling fallback twice with the same block timestamp", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send first transaction with 10 ether - should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Immediately send second transaction with 10 ether in the same block
    // This should revert in the original contract because block.timestamp
    // is not greater than pastBlockTime (which was set in tx1)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx2).to.be.reverted;
  });
});