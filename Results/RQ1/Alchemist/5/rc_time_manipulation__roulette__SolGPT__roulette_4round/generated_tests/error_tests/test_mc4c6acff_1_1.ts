import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc4c6acff test", function () {
  it("should detect mutant where block.number-1 is used instead of block.number", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether to enable transfers
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("100")
    });
    await fundTx.wait();

    // Get current block number and calculate the next block that is a multiple of 15
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentBlockNumber = currentBlock.number;
    const nextMultipleOf15 = currentBlockNumber + (15 - (currentBlockNumber % 15));

    // Mine blocks until we reach a block number that is a multiple of 15 (but not block 1)
    while ((await ethers.provider.getBlock("latest")).number < nextMultipleOf15) {
      await ethers.provider.send("evm_mine", []);
    }

    const targetBlockNumber = (await ethers.provider.getBlock("latest")).number;
    expect(targetBlockNumber % 15).to.equal(0);
    expect(targetBlockNumber).to.not.equal(1);

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Call fallback with exactly 10 ether
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // In the original contract, balance should increase by the contract balance (since block % 15 == 0)
    // In the mutant, balance should NOT increase because it only pays when block.number == 1
    const finalBalance = await ethers.provider.getBalance(addr1.address);

    // The test passes on original (balance increases) but fails on mutant (balance unchanged)
    // This kills the mutant because it expects the transfer to happen
    expect(finalBalance).to.be.gt(initialBalance);
  });
});