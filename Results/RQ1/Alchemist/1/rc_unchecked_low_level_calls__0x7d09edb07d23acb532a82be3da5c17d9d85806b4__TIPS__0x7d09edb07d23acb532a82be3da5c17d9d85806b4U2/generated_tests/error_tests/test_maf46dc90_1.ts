import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant maf46dc90 test", function () {
  it("should detect the mutant that changes loseWager from betLimit/2 to betLimit+2", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("10");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Owner opens the contract to public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to ensure the player loses (winning number != difficulty/2)
    // difficulty = 10, so difficulty/2 = 5, winningNumber will be 1-10
    await instance.connect(owner).AdjustDifficulty(10);

    // Player wagers exactly betLimit
    await instance.connect(player).wager({ value: betLimit });

    // Get initial whale balance
    const whaleBalanceBefore = await ethers.provider.getBalance(whale.address);

    // Get contract balance before play
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);

    // Mine a block to ensure block.number > timestamps[player]
    await ethers.provider.send("evm_mine", []);

    // Player plays - should lose because winningNumber won't be 5 (difficulty/2)
    await instance.connect(player).play();

    // Get whale balance after
    const whaleBalanceAfter = await ethers.provider.getBalance(whale.address);
    const whaleReceived = whaleBalanceAfter - whaleBalanceBefore;

    // Get contract balance after
    const contractBalanceAfter = await ethers.provider.getBalance(instance.target);

    // In the ORIGINAL contract: loseWager(betLimit / 2) sends 5 ETH to whale
    // In the MUTANT: loseWager(betLimit + 2) sends 12 ETH to whale
    // If the whale received betLimit/2 (5 ETH), the contract still has 5 ETH (original behavior)
    // If the whale received betLimit+2 (12 ETH), the contract has negative balance (mutant behavior)
    
    // The original sends exactly betLimit/2 = 5 ETH
    expect(whaleReceived).to.equal(ethers.parseEther("5"));
    
    // Contract should have remaining balance = betLimit - betLimit/2 = 5 ETH
    expect(contractBalanceAfter).to.equal(ethers.parseEther("5"));
  });
});