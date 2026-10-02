import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - keccak256 replaced with sha256", function () {
  it("should detect mutant by comparing pot value after play() with known block parameters", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Get current block timestamp and difficulty to predict random outcome
    const blockBefore = await ethers.provider.getBlock("latest");
    const timestamp = blockBefore.timestamp;
    const difficulty = blockBefore.difficulty;
    
    // Compute expected random value using keccak256 (original behavior)
    const hash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [timestamp, difficulty]
      )
    );
    const expectedRandom = BigInt(hash) % 2n;
    
    // Send transaction and get block info from the mined block
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt = await tx.wait();
    const blockAfter = await ethers.provider.getBlock(receipt.blockNumber);
    
    // Get the actual block parameters used in the transaction
    const actualTimestamp = blockAfter.timestamp;
    const actualDifficulty = blockAfter.difficulty;
    
    // Compute what the original contract would have produced
    const actualHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [actualTimestamp, actualDifficulty]
      )
    );
    const originalRandom = BigInt(actualHash) % 2n;
    
    // Get pot after transaction
    const potAfter = await instance.pot();
    
    // If random == 0 (original), pot should be 0; if random == 1, pot should be TICKET_AMOUNT
    if (originalRandom === 0n) {
      expect(potAfter).to.equal(0n);
    } else {
      expect(potAfter).to.equal(TICKET_AMOUNT);
    }
    
    // The mutant will produce a different hash output, causing different pot value
    // This assertion will fail on the mutant because sha256 gives different result
  });
});