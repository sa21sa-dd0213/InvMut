import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m81269e9f - timestamp multiplication", function () {
  it("should kill the mutant by sending two transactions in the same second", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Send first transaction with exactly 10 ether
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();
    
    // Immediately send second transaction with exactly 10 ether (same timestamp)
    // The original contract would revert because pastBlockTime > block.timestamp
    // The mutant would allow it (since block.timestamp * 1 == block.timestamp, no +1 delay)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // The mutant allows the second call to succeed, so expect it NOT to revert
    // In the original, this would revert - so if the transaction succeeds, we detected the mutant
    await expect(tx2).to.not.be.reverted;
  });
});