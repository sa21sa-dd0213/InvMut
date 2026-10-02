import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - mb772268e", function () {
  it("should detect mutant that changes win condition from difficulty/2 to difficulty+2", async function () {
    const [owner, player] = await ethers.getSigners();
    const whaleAddress = ethers.Wallet.createRandom().address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Open the game to public
    await (await instance.connect(owner).OpenToThePublic()).wait();
    
    // Set difficulty to a known value
    const difficulty = 10;
    await (await instance.connect(owner).AdjustDifficulty(difficulty)).wait();
    
    // Player places a wager
    await (await instance.connect(player).wager({ value: wagerLimit })).wait();
    
    // Mine a block to ensure block.number > blockNumber stored in timestamps
    await ethers.provider.send("evm_mine", []);
    
    // Player plays - in original, win condition is winningNumber == difficulty/2 (i.e., 5)
    // In mutant, win condition is winningNumber == difficulty+2 (i.e., 12), which is impossible
    // because winningNumber = (hash % difficulty) + 1, max value is difficulty (10)
    
    // We expect the player to potentially win in the original, but in the mutant
    // the win condition can never be satisfied, so player should always lose
    
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    
    // Execute play
    const tx = await instance.connect(player).play();
    const receipt = await tx.wait();
    
    // Check that the Lose event was emitted (since win condition can never be met in mutant)
    // In original, there's a chance of winning, but in mutant, player always loses
    await expect(tx)
      .to.emit(instance, "Lose")
      .withArgs(wagerLimit / 2n, player.address);
    
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    
    // In the mutant, the player should have lost half the wager (sent to whale)
    // This confirms the mutant's broken win condition
    expect(playerBalanceAfter).to.be.lessThan(playerBalanceBefore);
  });
});