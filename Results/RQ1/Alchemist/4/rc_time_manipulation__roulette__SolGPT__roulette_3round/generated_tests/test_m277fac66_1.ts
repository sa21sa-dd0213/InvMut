import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m277fac66", function () {
  it("should detect mutant that changes msg.value == 10 ether to msg.value - 1 == 10 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance of contract
    const initialBalance = await ethers.provider.getBalance(instance.target);
    expect(initialBalance).to.equal(0);

    // Send exactly 10 ether to the contract - this should work in original
    // but fail in the mutant (mutant requires 10 ether + 1 wei)
    const tx = await owner.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // In the original contract, this transaction succeeds and updates pastBlockTime
    // In the mutant, this transaction reverts because msg.value - 1 != 10 ether
    // The contract balance should be 0 if the transaction reverted (mutant killed)
    // or 10 ether if the transaction succeeded (original behavior)
    const finalBalance = await ethers.provider.getBalance(instance.target);
    expect(finalBalance).to.equal(ethers.parseEther("10"));
  });
});