import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m0c4ffa1e", function () {
  it("should NOT transfer balance when block.number % 15 != 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("100")
    });

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Send exactly 10 ether to trigger the fallback in a block where number % 15 != 0
    // We need to ensure we're not in a block divisible by 15
    let blockNumber = await ethers.provider.getBlockNumber();
    while (blockNumber % 15 === 0) {
      // Mine a new block by sending a simple transaction
      await owner.sendTransaction({
        to: owner.address,
        value: 0
      });
      blockNumber = await ethers.provider.getBlockNumber();
    }

    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check that contract balance is unchanged (no payout occurred)
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(initialBalance + ethers.parseEther("10"));
  });
});