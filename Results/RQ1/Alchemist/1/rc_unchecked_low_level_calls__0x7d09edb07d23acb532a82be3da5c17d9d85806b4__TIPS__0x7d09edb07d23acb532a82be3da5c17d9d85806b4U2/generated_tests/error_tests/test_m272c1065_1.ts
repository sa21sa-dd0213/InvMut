import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - play() function", function () {
  it("should kill mutant m272c1065 by verifying losing scenario when winningNumber > difficulty/2", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    
    // Deploy with whale address and bet limit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Open the game to the public
    await (await instance.OpenToThePublic()).wait();

    // Set difficulty to 10 so midpoint is 5
    // winningNumber = 5 should win, winningNumber > 5 should lose in original
    await (await instance.AdjustDifficulty(10)).wait();

    // Player wagers exactly betLimit
    await (await instance.connect(player).wager({ value: betLimit })).wait();

    // Mine blocks to ensure block.number > timestamps[player]
    for (let i = 0; i < 3; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Now call play() - we need winningNumber to be > difficulty/2 (i.e., > 5)
    // The winningNumber is computed as: uint256(keccak256(abi.encodePacked(blockhash(blockNumber), msg.sender))) % difficulty + 1
    // We can control msg.sender (player address) to influence the hash
    
    // Try different player addresses until we get winningNumber > 5
    // Since we can't easily control the hash, let's use the fact that we can
    // deploy multiple instances or try different block numbers
    
    // Alternative approach: Use a fixed player and check that if winningNumber > difficulty/2
    // the original contract emits Lose event. We'll use a deterministic approach:
    // Calculate expected winningNumber for this player at this block
    
    const blockNumber = (await ethers.provider.getBlock("latest")).number;
    
    // Get the winning number by replicating the calculation
    const blockHash = await ethers.provider.send("eth_getBlockByNumber", [
      ethers.toBeHex(blockNumber - 3),
      false
    ]);
    
    const hashData = ethers.solidityPacked(
      ["bytes32", "address"],
      [blockHash.hash, player.address]
    );
    
    const winningNumber = (BigInt(ethers.keccak256(hashData)) % 10n) + 1n;
    
    // If winningNumber > 5, the original should lose, mutant would win
    // If winningNumber <= 5, we need to try again with different conditions
    
    if (winningNumber > 5n) {
      // This is our test case - winningNumber > difficulty/2
      // Original: lose, Mutant: win
      
      const whaleBalanceBefore = await ethers.provider.getBalance(whale.address);
      
      const tx = await instance.connect(player).play();
      const receipt = await tx.wait();
      
      // In original, this should emit Lose event and transfer to whale
      // In mutant, this would emit Win event and transfer to player
      
      // Check that whale received the funds (original behavior)
      const whaleBalanceAfter = await ethers.provider.getBalance(whale.address);
      
      // In original: whale gets betLimit/2
      // In mutant: player gets half the contract balance
      expect(whaleBalanceAfter - whaleBalanceBefore).to.equal(betLimit / 2n);
      
      // Also verify the Lose event was emitted
      await expect(tx)
        .to.emit(instance, "Lose")
        .withArgs(betLimit / 2n, player.address);
      
    } else {
      // If winningNumber <= 5, we need to try again
      // Mine more blocks and try with a different block hash
      for (let i = 0; i < 5; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      // Deploy new player contract or just skip this test iteration
      // For simplicity, we'll deploy a fresh instance with different whale address
      // to get a different block number scenario
      
      const [owner2, whale2, player2] = await ethers.getSigners();
      const instance2 = await Factory.deploy(whale2.address, betLimit);
      await instance2.waitForDeployment();
      
      await (await instance2.OpenToThePublic()).wait();
      await (await instance2.AdjustDifficulty(10)).wait();
      await (await instance2.connect(player2).wager({ value: betLimit })).wait();
      
      for (let i = 0; i < 3; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      const blockNumber2 = (await ethers.provider.getBlock("latest")).number;
      const blockHash2 = await ethers.provider.send("eth_getBlockByNumber", [
        ethers.toBeHex(blockNumber2 - 3),
        false
      ]);
      
      const hashData2 = ethers.solidityPacked(
        ["bytes32", "address"],
        [blockHash2.hash, player2.address]
      );
      
      const winningNumber2 = (BigInt(ethers.keccak256(hashData2)) % 10n) + 1n;
      
      expect(winningNumber2).to.be.greaterThan(5n);
      
      const whaleBalanceBefore2 = await ethers.provider.getBalance(whale2.address);
      
      const tx2 = await instance2.connect(player2).play();
      
      const whaleBalanceAfter2 = await ethers.provider.getBalance(whale2.address);
      
      expect(whaleBalanceAfter2 - whaleBalanceBefore2).to.equal(betLimit / 2n);
      
      await expect(tx2)
        .to.emit(instance2, "Lose")
        .withArgs(betLimit / 2n, player2.address);
    }
  });
});