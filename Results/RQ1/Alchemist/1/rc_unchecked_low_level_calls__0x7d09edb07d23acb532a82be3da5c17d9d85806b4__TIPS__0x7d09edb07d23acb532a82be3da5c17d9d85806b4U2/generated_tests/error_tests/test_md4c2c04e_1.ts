import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant md4c2c04e - kill test", function () {
  it("should detect mutant that always sets win condition to false", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    
    // Deploy contract with required constructor args (whale address, wager limit)
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Set difficulty to 2 (so winning number == 1, since difficulty/2 = 1)
    await instance.connect(owner).AdjustDifficulty(2);
    
    // Open contract to public
    await instance.connect(owner).OpenToThePublic();
    
    // Player makes a wager
    const wagerTx = await instance.connect(player).wager({ value: betLimit });
    await wagerTx.wait();

    // Record the block number where wager was placed
    const wagerBlock = await ethers.provider.getBlockNumber();
    
    // Mine blocks to advance past the wager block
    for (let i = 0; i < 5; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Calculate expected winning number for this specific scenario
    // We need winningNumber == difficulty/2 == 1
    // winningNumber = uint256(keccak256(blockhash(wagerBlock), player.address)) % difficulty + 1
    // To guarantee a win, we need the hash to produce 0 when modded by 2
    // We'll use a deterministic approach: mine until we get a winning hash
    
    let attempts = 0;
    let won = false;
    let playTx;
    
    while (!won && attempts < 100) {
      // Try playing at current block
      playTx = await instance.connect(player).play();
      const receipt = await playTx.wait();
      
      // Check if Win event was emitted (means player won)
      const winEvent = receipt.logs.find(
        (log: any) => log.topics[0] === ethers.id("Win(uint256,address)")
      );
      
      if (winEvent) {
        won = true;
      } else {
        // If no win, re-wager and try again with new block
        const newWagerTx = await instance.connect(player).wager({ value: betLimit });
        await newWagerTx.wait();
        // Mine blocks
        for (let i = 0; i < 5; i++) {
          await ethers.provider.send("evm_mine", []);
        }
      }
      attempts++;
    }

    // If we found a winning scenario, verify the payout
    if (won) {
      const contractBalance = await instance.ethBalance();
      // Player should have received half the contract balance
      const expectedPayout = contractBalance; // balance after payout would be half
      // Verify player's balance increased
      const playerBalanceAfter = await ethers.provider.getBalance(player.address);
      expect(playerBalanceAfter).to.be.gt(ethers.parseEther("10000")); // initial balance check
    }

    // The mutant would never produce a Win event, so this test would fail
    // on the mutant because it would never find a winning scenario
    expect(won).to.be.true;
  });
});