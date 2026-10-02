import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - onlyPlayers modifier removed from play()", function () {
  it("should revert when calling play() from an address that hasn't wagered (original reverts, mutant succeeds)", async function () {
    const [owner, player1, player2] = await ethers.getSigners();
    
    // Deploy contract with required constructor arguments
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(owner.address, betLimit);
    await instance.waitForDeployment();
    
    // Open the game to the public
    await instance.connect(owner).OpenToThePublic();
    
    // Set difficulty to a value that ensures the winning condition check passes
    // We need difficulty = 2 so that difficulty/2 = 1, and winningNumber will be 1
    await instance.connect(owner).AdjustDifficulty(2);
    
    // Player1 places a wager
    await instance.connect(player1).wager({ value: betLimit });
    
    // Mine a block to advance block.number so the play() condition passes
    await ethers.provider.send("evm_mine", []);
    
    // Player2 (who has NOT wagered) attempts to call play()
    // On the original contract this should revert due to onlyPlayers modifier
    // On the mutant (without onlyPlayers) it should succeed
    await expect(
      instance.connect(player2).play()
    ).to.not.be.reverted;
    
    // Additional verification: player2 should not have wager state set
    expect(await instance.hasPlayerWagered(player2.address)).to.be.false;
  });
});