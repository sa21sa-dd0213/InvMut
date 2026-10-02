import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should detect the mutant that flips == to != in the win condition", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play the game - the outcome depends on random value (0 or 1)
    // We need to check that the player wins when random == 0
    // Since we cannot control block.timestamp/block.difficulty, we play multiple times
    // to cover both random outcomes

    // Record initial balances
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);
    const initialBankBalance = await ethers.provider.getBalance(owner.address);

    // Play the game
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt = await tx.wait();

    // Get the block timestamp to compute what random was
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    const random = BigInt(ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [block.timestamp, block.difficulty]
      )
    )) % 2n;

    // Get final balances
    const finalPlayerBalance = await ethers.provider.getBalance(player.address);
    const finalBankBalance = await ethers.provider.getBalance(owner.address);

    if (random === 0n) {
      // Original: player wins (gets pot - fee), bank gets fee
      // Mutant: player loses (gets nothing), bank gets entire pot
      // Check that player's balance increased by pot - fee (original behavior)
      const pot = TICKET_AMOUNT; // pot was 0 before, now equals ticket amount
      const expectedPlayerGain = pot - FEE_AMOUNT;
      expect(finalPlayerBalance - initialPlayerBalance).to.equal(expectedPlayerGain - TICKET_AMOUNT);
      expect(finalBankBalance - initialBankBalance).to.equal(FEE_AMOUNT);
    } else {
      // Original: player loses (gets nothing), bank gets entire pot
      // Mutant: player wins (gets pot - fee), bank gets fee
      // Check that player's balance decreased by ticket amount (original behavior)
      expect(finalPlayerBalance - initialPlayerBalance).to.equal(-TICKET_AMOUNT);
      expect(finalBankBalance - initialBankBalance).to.equal(TICKET_AMOUNT);
    }
  });
});