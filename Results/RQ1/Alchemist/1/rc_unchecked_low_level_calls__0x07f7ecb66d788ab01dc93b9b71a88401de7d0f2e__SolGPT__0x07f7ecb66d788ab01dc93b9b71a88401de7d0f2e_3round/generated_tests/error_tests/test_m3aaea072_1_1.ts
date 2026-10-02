import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - m3aaea072", function () {
  it("should detect the mutant where +1 is replaced with -1 in winningNumber calculation", async function () {
    const [owner, player, whale] = await ethers.getSigners();
    
    // Deploy with required constructor arguments: whaleAddress, wagerLimit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();
    
    // Set difficulty to a known value for predictable testing
    const difficulty = 10; // Must be >= 2 so that difficulty/2 = 5
    await instance.connect(owner).AdjustDifficulty(difficulty);
    
    // Open the contract to the public
    await instance.connect(owner).OpenToThePublic();
    
    // Player makes a wager
    await instance.connect(player).wager({ value: betLimit });
    
    // Mine a block to advance block.number so blockhash is available
    await ethers.provider.send("evm_mine", []);
    
    // Calculate the expected winning condition for the ORIGINAL contract:
    // winningNumber = (hash % difficulty) + 1
    // We need (hash % difficulty) + 1 == difficulty / 2 => (hash % difficulty) == difficulty/2 - 1 = 4
    // So we need to find a blockhash such that (uint256(blockhash) % 10) == 4
    // We'll mine blocks until we find such a block
    
    let foundBlock = false;
    let targetBlockNumber;
    
    for (let i = 0; i < 100; i++) {
      await ethers.provider.send("evm_mine", []);
      const currentBlock = await ethers.provider.getBlock("latest");
      const blockNum = currentBlock!.number;
      const blockHash = currentBlock!.hash;
      
      // Compute hash % difficulty
      const hashMod = BigInt(blockHash) % BigInt(difficulty);
      
      if (hashMod === BigInt(4)) { // difficulty/2 - 1 = 4
        targetBlockNumber = blockNum;
        foundBlock = true;
        break;
      }
    }
    
    expect(foundBlock).to.be.true;
    
    // Now the player calls play() - the timestamp should be set to the block where they wagered
    // We need to simulate that the player's timestamp is from a previous block
    // Since we already mined blocks after the wager, the condition blockNumber < block.number should hold
    
    // Get the player's wager block number (the block where wager was called)
    // We can't directly access timestamps mapping, but we know wager was called before the mined blocks
    
    // Call play() - this should succeed and compute winningNumber
    // In the original: (hash % 10) + 1 = 5 => win
    // In the mutant: (hash % 10) - 1 = 3 => lose (because hash % 10 = 4, minus 1 = 3, not equal to 5)
    
    // Get balance before play
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);
    
    // Execute play
    const tx = await instance.connect(player).play();
    const receipt = await tx.wait();
    
    // Check the outcome - in original, player should win and receive half the contract balance
    // In mutant, player should lose and whale receives betLimit/2
    
    // For the original: payout sends address(this).balance / 2 to winner
    // For the mutant: loseWager sends betLimit / 2 to whale
    
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    const contractBalanceAfter = await ethers.provider.getBalance(instance.target);
    
    // In the original, player's balance increases by contractBalanceBefore / 2
    // In the mutant, player's balance stays the same (they lose) and whale gets betLimit/2
    
    // The test should FAIL on the mutant because the original would succeed with a win
    // but the mutant produces a loss
    
    // Assert that the player received the payout (this should fail on mutant)
    const expectedPayout = contractBalanceBefore / 2n;
    expect(playerBalanceAfter - playerBalanceBefore).to.equal(expectedPayout);
    
    // Also verify the Win event was emitted (original behavior)
    await expect(tx)
      .to.emit(instance, "Win")
      .withArgs(expectedPayout, player.address);
  });
});