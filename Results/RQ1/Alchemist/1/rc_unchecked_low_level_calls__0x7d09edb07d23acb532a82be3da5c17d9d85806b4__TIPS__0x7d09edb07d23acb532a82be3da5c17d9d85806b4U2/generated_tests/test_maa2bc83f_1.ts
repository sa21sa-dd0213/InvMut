import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - maa2bc83f", function () {
  it("should detect arithmetic change from division to subtraction in loseWager call", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    
    // Deploy with constructor args: whale address and betLimit
    const betLimit = ethers.parseEther("1"); // 1 ETH
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await instance.connect(owner).OpenToThePublic();
    
    // Set difficulty high enough that player will lose
    // difficulty / 2 must never equal the random number for loss to occur
    // We'll use difficulty = 100, so winning number would be difficulty/2 = 50
    // With blockhash randomness, player will almost certainly lose
    await instance.connect(owner).AdjustDifficulty(100);
    
    // Record initial contract balance
    const initialBalance = await ethers.provider.getBalance(instance.target);
    
    // Player makes wager
    await instance.connect(player).wager({ value: betLimit });
    
    // Advance to next block so block.number > timestamps[player]
    await ethers.provider.send("evm_mine", []);
    
    // Play - should result in loss
    await instance.connect(player).play();
    
    // Get final contract balance
    const finalBalance = await ethers.provider.getBalance(instance.target);
    const balanceDecrease = initialBalance - finalBalance;
    
    // In original: loseWager(betLimit / 2) = 0.5 ETH
    // In mutant: loseWager(betLimit - 2) = ~1 ETH - 2 wei (practically 1 ETH)
    // The balance decrease should be exactly half the bet limit (0.5 ETH)
    expect(balanceDecrease).to.equal(betLimit / 2n);
  });
});