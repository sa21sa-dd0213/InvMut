import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - kill m8352f4ad", function () {
  it("should pay out entire balance when block.number is multiple of 15 and 10 ether is sent", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("100")
    });

    // Get initial balances
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Mine blocks until we find one where block.number % 15 == 0
    let targetBlock;
    let currentBlock = await ethers.provider.getBlockNumber();
    const blocksToMine = (15 - (currentBlock % 15)) % 15;
    
    // Mine to reach the target block
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    targetBlock = await ethers.provider.getBlockNumber();
    expect(targetBlock % 15).to.equal(0);

    // Player sends exactly 10 ether
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // After the transaction, if condition was true, contract balance should be transferred to player
    const finalPlayerBalance = await ethers.provider.getBalance(player.address);
    const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Expected: player receives entire contract balance (initial + 10 ether)
    const expectedPlayerBalance = initialPlayerBalance + initialContractBalance + ethers.parseEther("10");
    
    expect(finalContractBalance).to.equal(0);
    expect(finalPlayerBalance).to.equal(expectedPlayerBalance);
  });
});