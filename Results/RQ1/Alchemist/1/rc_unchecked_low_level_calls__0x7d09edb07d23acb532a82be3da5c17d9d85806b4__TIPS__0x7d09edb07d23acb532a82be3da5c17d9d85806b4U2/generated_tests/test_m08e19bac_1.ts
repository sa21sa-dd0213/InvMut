import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - m08e19bac", function () {
  it("should detect sha256 replacement by precomputing a winning hash with keccak256", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with a whale address and bet limit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(owner.address, betLimit);
    await instance.waitForDeployment();

    // Open contract to public
    await instance.connect(owner).OpenToThePublic();
    
    // Set difficulty to an even number (e.g., 10) so that difficulty/2 = 5 is integer
    const difficulty = 10;
    await instance.connect(owner).AdjustDifficulty(difficulty);
    
    // Player makes a wager
    await instance.connect(player).wager({ value: betLimit });
    
    // Mine blocks to advance block.number so blockhash is available
    await ethers.provider.send("evm_mine", []);
    
    // Now we need to find a blockNumber where keccak256(blockhash, player) % difficulty + 1 == difficulty/2
    // Since we cannot control blockhash, we iterate by mining blocks until condition is met
    let winningBlockFound = false;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (!winningBlockFound && attempts < maxAttempts) {
      // Get the block number when player wagered (which is the current block.number - 1 after mining)
      const currentBlock = await ethers.provider.getBlock("latest");
      const wagerBlockNumber = currentBlock.number - 1; // block before last mine
      
      // Get blockhash of the wager block
      const blockHash = (await ethers.provider.getBlock(wagerBlockNumber)).hash;
      
      // Compute keccak256 hash
      const encodedData = ethers.solidityPacked(
        ["bytes32", "address"],
        [blockHash, player.address]
      );
      const keccakHash = ethers.keccak256(encodedData);
      const winningNumber = (BigInt(keccakHash) % BigInt(difficulty)) + 1n;
      
      if (winningNumber === BigInt(difficulty / 2)) {
        winningBlockFound = true;
        // Now call play() - it should succeed and emit Win event under original contract
        const playTx = await instance.connect(player).play();
        const receipt = await playTx.wait();
        
        // Expect Win event to be emitted
        await expect(playTx).to.emit(instance, "Win");
        
        // Player should receive half the contract balance
        const contractBalance = await ethers.provider.getBalance(instance.target);
        const expectedPayout = contractBalance / 2n;
        
        // Verify player balance increased
        const playerBalanceBefore = await ethers.provider.getBalance(player.address);
        const txFee = receipt.gasUsed * receipt.gasPrice;
        // After transfer, player should have gained expectedPayout minus gas
        const playerBalanceAfter = await ethers.provider.getBalance(player.address);
        expect(playerBalanceAfter - playerBalanceBefore + txFee).to.equal(expectedPayout);
      } else {
        // Mine another block to change blockhash
        await ethers.provider.send("evm_mine", []);
        attempts++;
      }
    }
    
    // Ensure we found a winning condition
    expect(winningBlockFound).to.be.true;
  });
});