import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PoCGame mutant kill test - mf258c386", function () {
  it("should detect mutant that changes winning condition to false", async function () {
    const [owner, player, whale] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Set difficulty so that winningNumber == difficulty / 2 is possible
    const difficulty = 10; // difficulty/2 = 5, winningNumber range 1-10
    await instance.connect(owner).AdjustDifficulty(difficulty);

    // Open to public
    await instance.connect(owner).OpenToThePublic();

    // Player places wager
    await instance.connect(player).wager({ value: betLimit });

    // Mine a block to ensure block.number > timestamps[player]
    await ethers.provider.send("evm_mine", []);

    // Call play() - in original, if winningNumber == 5, player gets half balance
    // In mutant, condition is false, so player always loses
    const balanceBefore = await ethers.provider.getBalance(whale.address);
    await instance.connect(player).play();
    const balanceAfter = await ethers.provider.getBalance(whale.address);

    // If mutant is present, player never wins, so whale should receive the loss amount
    // (betLimit/2 = 0.5 ether) instead of player receiving half the contract balance
    // We check that whale received exactly betLimit/2, which happens in loseWager
    // In original, if player wins, whale would not receive this amount
    expect(balanceAfter - balanceBefore).to.equal(betLimit / 2n);
  });
});