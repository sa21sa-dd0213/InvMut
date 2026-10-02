import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc21c3882 - timestamp >= vs >", function () {
  it("should revert on second call within same second (original behavior), but mutant allows it", async function () {
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

    // Immediately send second transaction within the same block timestamp
    // This should revert in the original (require block.timestamp > pastBlockTime)
    // but succeed in the mutant (require block.timestamp >= pastBlockTime)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx2).to.be.reverted;
  });
});