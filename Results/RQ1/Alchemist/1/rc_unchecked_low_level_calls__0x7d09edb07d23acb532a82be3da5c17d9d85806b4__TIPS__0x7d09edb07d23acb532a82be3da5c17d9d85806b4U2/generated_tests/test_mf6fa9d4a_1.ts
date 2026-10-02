import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - mf6fa9d4a", function () {
  it("should detect mutant that uses block.prevrandao instead of blockhash(blockNumber)", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    
    // Deploy contract with whale address and bet limit
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();
    
    // Open contract to public
    await instance.connect(owner).OpenToThePublic();
    
    // Set difficulty to a known value for predictable testing
    const difficulty = 10;
    await instance.connect(owner).AdjustDifficulty(difficulty);
    
    // Player makes a wager in block N
    const wagerTx = await instance.connect(player).wager({ value: betLimit });
    const wagerReceipt = await wagerTx.wait();
    const wagerBlockNumber = wagerReceipt.blockNumber;
    
    // Mine a new block to ensure block.number > wagerBlockNumber
    // This changes block.prevrandao as well
    await ethers.provider.send("evm_mine");
    
    // Now player calls play() - in the original contract, the winning number
    // depends on blockhash(wagerBlockNumber) which is fixed.
    // In the mutant, it depends on block.prevrandao of the current block.
    // We can verify by checking the contract state after play()
    
    // Get the player's balance before play
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    const whaleBalanceBefore = await ethers.provider.getBalance(whale.address);
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);
    
    // Execute play()
    const playTx = await instance.connect(player).play();
    const playReceipt = await playTx.wait();
    
    // After play(), the player's wager should be reset to 0
    const hasWagered = await instance.hasPlayerWagered(player.address);
    expect(hasWagered).to.be.false;
    
    // Get the player's balance after play
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    const whaleBalanceAfter = await ethers.provider.getBalance(whale.address);
    const contractBalanceAfter = await ethers.provider.getBalance(instance.target);
    
    // Calculate what should have happened in the ORIGINAL contract:
    // winningNumber = uint256(keccak256(abi.encodePacked(blockhash(wagerBlockNumber), player))) % difficulty + 1
    // If winningNumber == difficulty/2 (i.e., 5), player gets half contract balance
    // Otherwise, player loses betLimit/2 to whale
    
    const blockHash = (await ethers.provider.getBlock(wagerBlockNumber)).hash;
    const expectedHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "address"],
        [blockHash, player.address]
      )
    );
    const expectedWinningNumber = (BigInt(expectedHash) % BigInt(difficulty)) + BigInt(1);
    const expectedWin = expectedWinningNumber === BigInt(difficulty / 2);
    
    if (expectedWin) {
      // Original: player wins half contract balance
      const expectedPayout = contractBalanceBefore / BigInt(2);
      expect(playerBalanceAfter - playerBalanceBefore).to.equal(expectedPayout);
      expect(contractBalanceAfter).to.equal(contractBalanceBefore - expectedPayout);
    } else {
      // Original: player loses betLimit/2 to whale
      const expectedLoss = betLimit / BigInt(2);
      expect(whaleBalanceAfter - whaleBalanceBefore).to.equal(expectedLoss);
      expect(contractBalanceAfter).to.equal(contractBalanceBefore - expectedLoss);
    }
    
    // The key assertion: if the mutant is present, the actual result will differ
    // from the expected result because block.prevrandao is used instead of blockhash(wagerBlockNumber)
    // We can detect this by checking if the result matches what the ORIGINAL would produce
    
    // If the original would have resulted in a win, but we got a loss (or vice versa),
    // that indicates the mutant is present
    const actualPlayerChange = playerBalanceAfter - playerBalanceBefore;
    const actualWhaleChange = whaleBalanceAfter - whaleBalanceBefore;
    
    if (expectedWin) {
      // Player should have received money
      expect(actualPlayerChange).to.be.gt(0);
    } else {
      // Whale should have received money (player lost)
      expect(actualWhaleChange).to.be.gt(0);
    }
  });
});