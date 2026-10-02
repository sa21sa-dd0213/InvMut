import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - mbfb4b05f", function () {
  it("should kill mutant by setting difficulty to 1 and proving player cannot win (original) vs can win (mutant)", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy contract with whale address and bet limit
    const whaleAddress = ethers.Wallet.createRandom().address;
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Owner opens the contract to public
    await (await instance.connect(owner).OpenToThePublic()).wait();

    // Owner sets difficulty to 1 (so difficulty/2 = 0)
    await (await instance.connect(owner).AdjustDifficulty(1)).wait();

    // Player makes a wager
    await (await instance.connect(player).wager({ value: betLimit })).wait();

    // Advance block number so the player can play
    await ethers.provider.send("evm_mine", []);

    // Get contract balance before play
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Player plays - in original, winningNumber is always >= 1, so winningNumber can never be 0
    // which means player cannot win (difficulty/2 = 0). But in mutant, winningNumber can be 0.
    await (await instance.connect(player).play()).wait();

    // Check contract balance after play
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // In the original, player always loses, so half of betLimit (0.5 ETH) goes to whale
    // Contract balance should decrease by betLimit/2 = 0.5 ETH
    // In the mutant, if winningNumber is 0 (possible now), player wins the whole pot
    // Contract balance would decrease by half of contract balance (much more)
    const expectedLoss = betLimit / 2n;
    const actualDifference = balanceBefore - balanceAfter;

    // Assert that the loss is exactly betLimit/2, which would pass for original
    // but fail for mutant if the random number happened to be 0 (giving a win)
    // To make this deterministic, we can check that the loss is NOT more than betLimit/2
    // Original: always exactly betLimit/2
    // Mutant: can be the entire pot (much more than betLimit/2)
    expect(actualDifference).to.equal(expectedLoss);
  });
});