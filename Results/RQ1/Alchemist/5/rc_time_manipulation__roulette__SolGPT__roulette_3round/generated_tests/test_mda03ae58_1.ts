import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mda03ae58", function () {
  it("should transfer contract balance when block.number % 15 == 0", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    const initialFund = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFund
    });

    // Get initial player balance
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);
    const contractAddress = await instance.getAddress();

    // Mine blocks to reach a block where block.number % 15 == 0
    let currentBlock = await ethers.provider.getBlock("latest");
    let targetBlockNumber = currentBlock.number + (15 - (currentBlock.number % 15));

    // Mine blocks to reach target
    while ((await ethers.provider.getBlock("latest")).number < targetBlockNumber - 1) {
      await ethers.provider.send("evm_mine", []);
    }

    // Send 10 ether to trigger fallback on the correct block
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check that player received the contract balance
    const finalPlayerBalance = await ethers.provider.getBalance(player.address);
    const contractBalance = await ethers.provider.getBalance(contractAddress);
    
    // Player should have received the full contract balance (original behavior)
    expect(finalPlayerBalance).to.be.gt(initialPlayerBalance);
    expect(contractBalance).to.equal(0);
  });
});