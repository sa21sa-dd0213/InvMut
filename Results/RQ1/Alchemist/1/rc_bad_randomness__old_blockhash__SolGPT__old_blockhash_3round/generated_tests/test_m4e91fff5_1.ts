import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test (m4e91fff5)", function () {
  it("should detect mutant where == is changed to <= by using a guess that is strictly less than the block hash", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in a guess that is numerically smaller than any possible block hash
    const lowGuess = "0x0000000000000000000000000000000000000000000000000000000000000001";
    const lockTx = await instance.connect(player).lockInGuess(lowGuess, { value: ethers.parseEther("1") });
    await lockTx.wait();

    // Mine enough blocks to settle
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + 2;
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Under original: player loses (guess != blockhash), no transfer
    // Under mutant: player wins (lowGuess <= blockhash), gets 2 ether
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    const settleTx = await instance.connect(player).settle();
    const receipt = await settleTx.wait();
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);

    // In original contract, balance should not increase (no transfer)
    // In mutant, balance would increase by 2 ether (minus gas)
    // We expect no transfer, so balance should be <= balanceBefore + small gas difference
    expect(playerBalanceAfter).to.be.lte(playerBalanceBefore + ethers.parseEther("0.01"));
  });
});