import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - mb77377cb", function () {
  it("should detect the mutant that flips the winning condition from random==0 to random!=0", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times to cover both random outcomes (0 and 1)
    // We'll track the pot after each play to detect the mutant behavior
    for (let i = 0; i < 10; i++) {
      const potBefore = await instance.pot();
      
      // Send transaction and capture the result
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      const receipt = await tx.wait();
      
      const potAfter = await instance.pot();
      
      // Determine the random outcome by checking the block timestamp
      // The random value is keccak256(block.timestamp, block.difficulty, msg.sender) % 2
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const random = BigInt(
        ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256", "address"],
            [block.timestamp, block.difficulty, player.address]
          )
        )
      ) % 2n;
      
      if (random === 0n) {
        // Original: player wins (pot should be reset to 0 after paying player)
        // Mutant: player loses (pot should increase by TICKET_AMOUNT)
        expect(potAfter).to.equal(0n); // This will fail on mutant
      } else {
        // Original: player loses (pot should increase by TICKET_AMOUNT)
        // Mutant: player wins (pot should be reset to 0)
        expect(potAfter).to.equal(potBefore + TICKET_AMOUNT); // This will fail on mutant
      }
    }
  });
});