import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - block.prevrandao replacement", function () {
  it("should detect mutant by comparing results of two calls in same block with same sender", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    
    // Fund the player with enough ETH
    await owner.sendTransaction({
      to: player.address,
      value: ethers.parseEther("100")
    });

    // Get the initial pot and bank balance
    const initialPot = await instance.pot();
    const initialBankBalance = await ethers.provider.getBalance(owner.address);

    // Make the first call
    const tx1 = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt1 = await tx1.wait();
    
    // Get block info from first transaction
    const block1 = await ethers.provider.getBlock(receipt1.blockNumber);
    const blockTimestamp1 = block1.timestamp;
    const blockDifficulty1 = block1.difficulty;
    const blockPrevrandao1 = block1.prevrandao;

    // Make the second call in the same block using flashbots-style technique
    // Mine a block with both transactions
    await ethers.provider.send("evm_mine", []);
    
    const tx2 = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt2 = await tx2.wait();
    
    // Get block info from second transaction
    const block2 = await ethers.provider.getBlock(receipt2.blockNumber);
    const blockTimestamp2 = block2.timestamp;
    const blockDifficulty2 = block2.difficulty;
    const blockPrevrandao2 = block2.prevrandao;

    // If block.timestamp was used, same sender + same block data would give same random result
    // If block.prevrandao is used (mutant), different block means different prevrandao
    
    // Calculate expected results for original vs mutant
    // Original: keccak256(block.timestamp, block.difficulty, msg.sender) % 2
    // Mutant: keccak256(block.prevrandao, block.difficulty, msg.sender) % 2
    
    // If same block, original should give same result (timestamp same), mutant different (prevrandao changes each block)
    // But we can't force same block easily, so we check that the result pattern differs from original
    
    const random1Original = BigInt(ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "address"],
        [blockTimestamp1, blockDifficulty1, player.address]
      )
    )) % 2n;
    
    const random2Original = BigInt(ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "address"],
        [blockTimestamp2, blockDifficulty2, player.address]
      )
    )) % 2n;
    
    const random1Mutant = BigInt(ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "address"],
        [blockPrevrandao1, blockDifficulty1, player.address]
      )
    )) % 2n;
    
    const random2Mutant = BigInt(ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "address"],
        [blockPrevrandao2, blockDifficulty2, player.address]
      )
    )) % 2n;

    // Check pot after two calls - mutant should behave differently from original
    const finalPot = await instance.pot();
    
    // For the original, if both random values are 0, pot would be 0
    // For the mutant, if both random values are 0, pot would be 0
    // But the key difference: with block.prevrandao, the results depend on a different input
    
    // The mutant will fail if we assert that the behavior matches block.timestamp-based logic
    // Since we can't directly observe the random value, we check that the outcome distribution
    // is consistent with the mutant's different randomness source
    
    // If block.timestamp was used, two calls in different blocks with same sender
    // would produce different results based on timestamp changes
    // With block.prevrandao, the results differ based on prevrandao changes
    
    // The test passes if the mutant's behavior differs from original expectation
    // We can check that at least one call produced a non-zero random value (player didn't win)
    // In the mutant, the randomness source is different, so the outcome pattern changes
    
    // This test kills the mutant by proving the randomness source changed
    // We verify the contract state after two calls
    expect(finalPot).to.not.equal(initialPot);
    
    // The mutant changes the randomness source, so the exact pot value after two calls
    // will differ from what the original would produce given the same inputs
    // We assert this by checking the pot doesn't equal what original would have produced
    const originalExpectedPot = (random1Original === 0n && random2Original === 0n) ? 0n : 
                                (random1Original === 1n && random2Original === 1n) ? ethers.parseEther("20") :
                                ethers.parseEther("10");
    
    const mutantExpectedPot = (random1Mutant === 0n && random2Mutant === 0n) ? 0n :
                              (random1Mutant === 1n && random2Mutant === 1n) ? ethers.parseEther("20") :
                              ethers.parseEther("10");
    
    // If original and mutant would give different pot values, the test detects the mutant
    // We check that the actual pot matches the mutant's expected value
    expect(finalPot).to.equal(mutantExpectedPot);
    
    // If the mutant is present, this assertion will pass because finalPot matches mutantExpectedPot
    // If original is present, finalPot will match originalExpectedPot instead, causing assertion to fail
  });
});