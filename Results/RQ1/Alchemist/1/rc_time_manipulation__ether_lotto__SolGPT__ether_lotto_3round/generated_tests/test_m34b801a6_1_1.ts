import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - block.prevrandao vs block.timestamp", function () {
  it("should detect mutant by verifying random outcome changes when block.prevrandao differs from block.timestamp", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Capture the pot before the first play
    const potBefore = await instance.pot();

    // Play with known block.timestamp and block.difficulty
    // We'll use a snapshot to control block context
    const snapshot = await ethers.provider.send("evm_snapshot", []);

    // Mine a block with specific timestamp and difficulty
    await ethers.provider.send("evm_setNextBlockTimestamp", [1000000]);
    await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);

    // Play the game
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt = await tx.wait();

    // Get the block info to verify our context
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    
    // In original contract: random = uint(keccak256(abi.encodePacked(block.timestamp, block.difficulty))) % 2
    // In mutant: random = uint(keccak256(abi.encodePacked(block.prevrandao, block.difficulty))) % 2

    // Calculate expected outcome for original contract
    const originalRandom = BigInt(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256"],
          [block.timestamp, block.difficulty]
        )
      )
    ) % 2n;

    // Calculate expected outcome for mutant (using block.prevrandao which is 0 in this context)
    const mutantRandom = BigInt(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256"],
          [block.prevrandao, block.difficulty]
        )
      )
    ) % 2n;

    // If the outcomes differ, the mutant would behave differently
    // We can detect this by checking pot state after play
    const potAfter = await instance.pot();

    if (originalRandom === 0n) {
      // Original would reset pot to 0
      expect(potAfter).to.equal(0);
    } else {
      // Original would keep pot
      expect(potAfter).to.equal(potBefore + TICKET_AMOUNT);
    }

    // The key assertion: if mutantRandom differs from originalRandom,
    // then the actual behavior (based on block.prevrandao) would contradict
    // what we expect from the original contract (based on block.timestamp)
    if (mutantRandom !== originalRandom) {
      // The mutant would have produced a different result
      // so the pot state would not match our original-based expectation
      // This test would fail, detecting the mutant
      expect(potAfter).to.not.equal(
        originalRandom === 0n ? 0 : potBefore + TICKET_AMOUNT
      );
    }

    // Restore snapshot
    await ethers.provider.send("evm_revert", [snapshot]);
  });
});