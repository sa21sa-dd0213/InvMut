import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m12239b3b - kill condition always true", function () {
  it("should detect mutant where winningNumber == difficulty / 2 is replaced with true", async function () {
    const [owner, player1, player2] = await ethers.getSigners();
    
    // Deploy with constructor arguments: whaleAddress, wagerLimit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(player2.address, betLimit);
    await instance.waitForDeployment();
    
    // Owner opens to public
    await (await instance.connect(owner).OpenToThePublic()).wait();
    
    // Set difficulty to 10 so winning number must be 5 (difficulty / 2)
    await (await instance.connect(owner).AdjustDifficulty(10)).wait();
    
    // Player1 wagers
    await (await instance.connect(player1).wager({ value: betLimit })).wait();
    
    // Advance block by mining a new block
    await ethers.provider.send("evm_mine", []);
    
    // Get initial contract balance
    const initialBalance = await instance.ethBalance();
    
    // Player1 plays - in original contract, this has ~10% chance to win
    // In mutant, it ALWAYS wins and pays out half the contract balance
    await (await instance.connect(player1).play()).wait();
    
    // Get balance after play
    const balanceAfterPlay = await instance.ethBalance();
    
    // In the mutant, the payout always happens, so balance should decrease
    // In the original, payout only happens if winningNumber == difficulty/2 (rare)
    // If mutant is active, balance decreased by at least half of initial balance
    // If original, balance would stay the same or decrease less (since loseWager sends betLimit/2)
    
    // We detect the mutant by checking that the contract lost MORE than what loseWager would send
    // loseWager sends betLimit/2 = 0.5 ether
    // Payout sends half the contract balance (much more than 0.5 ether)
    
    // In mutant: balance drops significantly (half the contract balance paid out)
    // In original: balance drops by exactly betLimit/2 (0.5 ether) if player loses
    const balanceDecrease = initialBalance - balanceAfterPlay;
    const loseAmount = betLimit / 2n;
    
    // If the decrease is greater than loseAmount, the mutant is active (payout happened)
    // This test will PASS on original (decrease <= loseAmount) and FAIL on mutant (decrease > loseAmount)
    expect(balanceDecrease).to.be.lte(loseAmount);
  });
});