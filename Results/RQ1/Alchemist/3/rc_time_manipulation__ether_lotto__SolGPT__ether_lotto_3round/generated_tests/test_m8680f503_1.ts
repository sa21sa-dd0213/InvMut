import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - m8680f503", function () {
  it("should detect condition inversion from == to !=", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Track initial balances
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);
    const initialBankBalance = await ethers.provider.getBalance(owner.address);
    
    // Play once - we need to force the random outcome to be 0
    // In the original: when random == 0, player gets pot - fee, bank gets fee
    // In the mutant: when random != 0, player gets pot - fee, bank gets fee
    // Since we can't control block.timestamp/difficulty easily, we play multiple times
    // and check that the behavior matches the original logic (== 0)
    
    // Play the game
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt = await tx.wait();
    
    // Get the block info to determine what random value was used
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    const random = BigInt(ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "uint256"],
        [block.timestamp, block.difficulty]
      )
    )) % 2n;
    
    // Check post-play balances
    const finalPlayerBalance = await ethers.provider.getBalance(player.address);
    const finalBankBalance = await ethers.provider.getBalance(owner.address);
    
    if (random === 0n) {
      // Original behavior: player should have gained pot - fee (9 ETH net after paying 10)
      // Player paid 10, received 9 back => net -1 ETH
      // Bank received 1 ETH fee
      expect(finalPlayerBalance).to.equal(initialPlayerBalance - TICKET_AMOUNT + (TICKET_AMOUNT - FEE_AMOUNT));
      expect(finalBankBalance).to.equal(initialBankBalance + FEE_AMOUNT);
    } else {
      // When random == 1, original does nothing, mutant would transfer
      // For original: player lost 10 ETH, bank gained nothing
      expect(finalPlayerBalance).to.equal(initialPlayerBalance - TICKET_AMOUNT);
      expect(finalBankBalance).to.equal(initialBankBalance);
    }
  });
});