import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test - m29a9ca51", function () {
  it("should revert when settling with a wrong guess (mutant incorrectly pays out)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in a deliberately wrong guess
    const wrongGuess = ethers.keccak256(ethers.toUtf8Bytes("wrong"));
    await instance.connect(player).lockInGuess(wrongGuess, { value: ethers.parseEther("1") });

    // Mine blocks to advance past the target block
    const targetBlock = (await ethers.provider.getBlock("latest"))!.number + 1;
    while ((await ethers.provider.getBlock("latest"))!.number <= targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get player's balance before settling
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Settle - in original this would not transfer ether, in mutant it does
    await instance.connect(player).settle();

    const balanceAfter = await ethers.provider.getBalance(player.address);

    // If mutant is active, balance will increase by 2 ether (incorrectly)
    // If original, balance should remain unchanged (minus gas costs)
    expect(balanceAfter).to.be.lessThanOrEqual(balanceBefore + ethers.parseEther("0.01")); // Allow only gas costs
  });
});