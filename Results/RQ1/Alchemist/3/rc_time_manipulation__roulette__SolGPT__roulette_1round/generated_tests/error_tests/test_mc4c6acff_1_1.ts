import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc4c6acff", function () {
  it("should revert when block.number % 15 == 0 but mutant uses block.number-1", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Mine blocks until block.number % 15 == 0
    const currentBlock = await ethers.provider.getBlockNumber();
    const blocksToMine = (15 - (currentBlock % 15)) % 15;
    
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    const blockBefore = await ethers.provider.getBlockNumber();
    expect(blockBefore % 15).to.equal(0);

    // Get contract balance before
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Send exactly 10 ether to trigger fallback
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get contract balance after
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // In original: payout occurs, balance decreases
    // In mutant: no payout (block.number-1 % 15 != 0), balance increases by 10
    expect(balanceAfter).to.be.lessThan(balanceBefore + ethers.parseEther("10"));
  });
});