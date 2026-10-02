import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mda340d38", function () {
  it("should revert when calling fallback in consecutive blocks without modulo condition being met", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance
    const initialBalance = ethers.parseEther("100");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance
    });

    // First call: should succeed and set pastBlockTime
    const tx1 = await user.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Get the contract balance after first call
    const balanceAfterFirst = await ethers.provider.getBalance(await instance.getAddress());

    // Mine a block to change block.number but not to a multiple of 15
    await ethers.provider.send("evm_mine");

    // Second call: in original, condition block.number % 15 == 0 fails (not multiple of 15), so no transfer
    // In mutant, condition is true, so transfer happens
    const tx2 = await user.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx2.wait();

    const balanceAfterSecond = await ethers.provider.getBalance(await instance.getAddress());

    // If mutant is killed (original behavior), balance should increase by 10 ether (no transfer)
    // If mutant is live, balance would be much lower (transfer happened)
    // We expect the original behavior: balance increased by exactly 10 ether
    const expectedBalance = balanceAfterFirst + ethers.parseEther("10");
    expect(balanceAfterSecond).to.equal(expectedBalance);
  });
});