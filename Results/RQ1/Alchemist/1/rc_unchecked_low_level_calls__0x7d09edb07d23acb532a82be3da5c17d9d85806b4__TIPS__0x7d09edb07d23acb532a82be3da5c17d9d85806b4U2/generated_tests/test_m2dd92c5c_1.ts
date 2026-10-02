import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m2dd92c5c - kill test", function () {
  it("should detect mutant where play always wins (winningNumber == difficulty / 2 replaced with true)", async function () {
    const [owner, player, whale] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Open to public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to 100 so the win condition is winningNumber == 50
    await instance.connect(owner).AdjustDifficulty(100);

    // Player places a wager
    await instance.connect(player).wager({ value: betLimit });

    // Mine a new block to ensure block.number > timestamps[player]
    await ethers.provider.send("evm_mine", []);

    // Player calls play() - in original contract they would likely lose,
    // but in mutant they always win and get half the contract balance
    const balanceBefore = await ethers.provider.getBalance(player.address);
    const contractBalanceBefore = await instance.ethBalance();

    await instance.connect(player).play();

    const balanceAfter = await ethers.provider.getBalance(player.address);
    const contractBalanceAfter = await instance.ethBalance();

    // In the original, most plays lose, so contract balance would decrease by half betLimit
    // and player balance would not increase significantly.
    // In the mutant, player always wins half the contract balance, so player gains
    // approximately contractBalanceBefore / 2 and contract balance is halved.
    const playerGain = balanceAfter - balanceBefore;
    const contractLoss = contractBalanceBefore - contractBalanceAfter;

    // If mutant is alive, playerGain will be roughly contractBalanceBefore / 2
    // If original, playerGain will be 0 (they lose and half betLimit goes to whale)
    expect(playerGain).to.be.gt(0);
    expect(contractLoss).to.equal(contractBalanceBefore / 2n);
  });
});