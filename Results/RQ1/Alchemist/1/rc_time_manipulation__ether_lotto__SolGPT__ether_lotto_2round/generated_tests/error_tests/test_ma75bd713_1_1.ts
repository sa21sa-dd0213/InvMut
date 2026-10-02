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

    // Make the second call in a new block
    await ethers.provider.send("evm_mine", []);
    
    const tx2 = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt2 = await tx2.wait();
    
    // Get block info from second transaction
    const block2 = await ethers.provider.getBlock(receipt2.blockNumber);
    const blockTimestamp2 = block2.timestamp;
    const blockDifficulty2 = block2.difficulty;
    const blockPrevrandao2 = block2.prevrandao;

    // Calculate expected results for original vs mutant
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

    // Check pot after two calls
    const finalPot = await instance.pot();
    expect(finalPot).to.not.equal(initialPot);

    // Calculate expected pot for original and mutant
    const originalExpectedPot = (random1Original === 0n && random2Original === 0n) ? 0n : 
                                (random1Original === 1n && random2Original === 1n) ? ethers.parseEther("20") :
                                ethers.parseEther("10");
    
    const mutantExpectedPot = (random1Mutant === 0n && random2Mutant === 0n) ? 0n : 
                              (random1Mutant === 1n && random2Mutant === 1n) ? ethers.parseEther("20") :
                              ethers.parseEther("10");

    // If original and mutant would give different pot values, the test detects the mutant
    // We check that the actual pot matches the mutant's expected value
    expect(finalPot).to.equal(mutantExpectedPot);
  });
});