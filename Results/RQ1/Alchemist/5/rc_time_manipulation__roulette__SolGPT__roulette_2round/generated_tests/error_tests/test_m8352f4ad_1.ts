import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m8352f4ad test", function () {
  it("should transfer balance when block.number % 15 == 0, but mutant prevents it", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Send 10 ether to the contract from player
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Mine blocks until block.number is a multiple of 15
    const currentBlock = await ethers.provider.getBlockNumber();
    const blocksToMine = 15 - (currentBlock % 15);
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get player balance before the trigger
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Send another 10 ether to trigger the fallback with block.number % 15 == 0
    const triggerTx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await triggerTx.wait();

    const balanceAfter = await ethers.provider.getBalance(player.address);

    // In original: player gets back contract balance (10 ether + 10 ether = 20 ether)
    // In mutant: player gets nothing back
    const expectedBalanceIncrease = ethers.parseEther("20"); // full contract balance
    const actualBalanceIncrease = balanceAfter - balanceBefore;
    expect(actualBalanceIncrease).to.equal(expectedBalanceIncrease);
  });
});