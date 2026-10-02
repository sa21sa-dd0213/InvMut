import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should kill mutant me5343345 (wrong guess should not receive ether)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in a guess that is intentionally different from any possible block hash
    const wrongGuess = ethers.keccak256(ethers.toUtf8Bytes("wrong guess"));
    await instance.connect(player).lockInGuess(wrongGuess, { value: ethers.parseEther("1") });

    // Mine enough blocks so that settle() can be called
    const targetBlock = (await ethers.provider.getBlock("latest")).number;
    while ((await ethers.provider.getBlock("latest")).number <= targetBlock + 1) {
      await ethers.provider.send("evm_mine", []);
    }

    // Record player's balance before settle
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Call settle - in the original contract this should NOT transfer ether
    await instance.connect(player).settle();

    // Player balance should NOT have increased because the guess was wrong
    // On the mutant, the balance would incorrectly increase, causing the test to fail
    const balanceAfter = await ethers.provider.getBalance(player.address);
    expect(balanceAfter).to.equal(balanceBefore);
  });
});