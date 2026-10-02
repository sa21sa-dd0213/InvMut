import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc4c6acff detection test", function () {
  it("should kill mutant by checking payout at block number multiple of 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Get current block number and calculate the next block that is a multiple of 15
    const currentBlock = await ethers.provider.getBlockNumber();
    const blocksUntilMultiple = (15 - (currentBlock % 15)) % 15;
    const targetBlock = currentBlock + blocksUntilMultiple;

    // Mine blocks to reach the target block number
    for (let i = 0; i < blocksUntilMultiple; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Record initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Send exactly 10 ether to trigger the fallback
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
    });
    await tx.wait();

    // Check that the payout occurred (balance increased by the full contract balance, not just 10 ether)
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // If the mutant is present, no payout occurs, so addr1 balance increases by exactly 10 ether
    // If original code, payout occurs and addr1 receives the contract balance
    expect(finalBalance).to.be.gt(initialBalance + ethers.parseEther("10"));
  });
});