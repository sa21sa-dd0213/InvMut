import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mb6ced059 test", function () {
  it("should kill the mutant by sending exactly 10 ether and expecting success on original but revert on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to the fallback function
    // Original: requires msg.value == 10 ether -> succeeds
    // Mutant:   requires msg.value+1 == 10 ether -> requires 9 ether, so 10 ether causes revert
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx).to.be.reverted;
  });
});