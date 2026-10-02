import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - md3aae15f", function () {
  it("should kill mutant by exploiting reversed timestamp comparison", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: succeeds, sets pastBlockTime = block.timestamp + 1
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call in the same block: should revert in original (timestamp < pastBlockTime)
    // but passes in mutant (timestamp < pastBlockTime is true)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // In original, this would revert; in mutant it succeeds - we expect revert to detect mutant
    await expect(tx2).to.be.reverted;
  });
});