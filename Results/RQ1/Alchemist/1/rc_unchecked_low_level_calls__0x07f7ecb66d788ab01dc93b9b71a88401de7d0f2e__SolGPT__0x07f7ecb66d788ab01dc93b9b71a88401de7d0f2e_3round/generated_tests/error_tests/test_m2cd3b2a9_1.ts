import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m2cd3b2a9 test", function () {
  it("should kill the mutant by verifying that player loses when winningNumber != difficulty/2", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with required constructor arguments
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(player.address, betLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await instance.connect(owner).OpenToThePublic();
    
    // Set difficulty to a known value (e.g., 10)
    const difficulty = 10;
    await instance.connect(owner).AdjustDifficulty(difficulty);
    
    // Player makes a wager
    await instance.connect(player).wager({ value: betLimit });
    
    // Mine a block to ensure block.number > timestamps[player]
    await ethers.provider.send("evm_mine", []);
    
    // Play the game - in the original contract, player loses when winningNumber != difficulty/2
    // The mutant incorrectly pays out when winningNumber != difficulty/2
    // We need to verify that the player does NOT receive a payout
    
    // Get the contract balance before play
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Execute play
    await instance.connect(player).play();
    
    // Get the contract balance after play
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    
    // In the original contract, the player loses and the contract sends betLimit/2 to whale
    // In the mutant, the player wins and the contract sends half its balance to the player
    // If the mutant is active, the player's balance would increase, and contract balance would decrease by more than betLimit/2
    
    // Check that the player did NOT receive a payout (i.e., they lost)
    // The contract balance should have decreased by exactly betLimit/2 (the lose amount sent to whale)
    // If the mutant is active, the balance would decrease by half the contract balance (much larger amount)
    const expectedLoss = betLimit / 2n;
    const actualLoss = balanceBefore - balanceAfter;
    
    // This assertion will fail on the mutant because the mutant sends a larger payout
    expect(actualLoss).to.equal(expectedLoss);
  });
});