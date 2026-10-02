import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Roulette mutant m19e5b15a test", function () {
  it("should detect mutant where block.number is replaced with block.number-1", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get current block number and find next block that is a multiple of 15
    let blockNumber = await ethers.provider.getBlockNumber();
    const blocksUntilMultiple = (15 - (blockNumber % 15)) % 15;
    
    // Mine blocks until we reach a block where block.number % 15 == 0
    for (let i = 0; i < blocksUntilMultiple; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    const balanceBefore = await ethers.provider.getBalance(player.address);
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Player sends exactly 10 ETH to trigger the fallback
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    const balanceAfter = await ethers.provider.getBalance(player.address);
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // In the original contract, the transfer would occur (balance increases by contract balance)
    // In the mutant (block.number-1 % 15 == 0), the condition only triggers at block 1
    // Since we're not at block 1, the transfer won't happen
    expect(contractBalanceAfter).to.equal(contractBalanceBefore + ethers.parseEther("10"));
  });
});