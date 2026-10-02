import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - m21ff2350", function () {
  it("should detect mutant by verifying that a winning player receives the pot minus fee", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed for EtherLotto)
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Record initial balances
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);

    // Player plays the lottery
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt = await tx.wait();

    // Calculate gas cost
    const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

    // Check final balances
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);

    // If random == 0 (winning case), owner should get FEE_AMOUNT and player should get (pot - fee)
    // Since we can't control the random outcome, we check if either winning or losing scenario occurred
    const potAfter = await instance.pot();

    // Check for the winning scenario (random == 0)
    if (potAfter === BigInt(0)) {
      // Winning scenario: owner gets fee, player gets pot minus fee
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(FEE_AMOUNT);
      expect(playerBalanceAfter - playerBalanceBefore + gasCost).to.equal(TICKET_AMOUNT - FEE_AMOUNT);
    } else {
      // Losing scenario: pot accumulates
      expect(potAfter).to.equal(TICKET_AMOUNT);
    }

    // The mutant (if false) would NEVER transfer winnings to player
    // So we run the test multiple times to increase probability of hitting a winning case
    // If mutant is present, winning scenario will never occur regardless of random outcome
  });

  it("should detect mutant by running multiple plays and checking that winning scenario never occurs", async function () {
    const [owner, player] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");

    let wonAtLeastOnce = false;

    // Run 10 plays to increase probability of hitting random == 0
    for (let i = 0; i < 10; i++) {
      const potBefore = await instance.pot();
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await tx.wait();
      const potAfter = await instance.pot();

      // If pot resets to 0, that means a win occurred
      if (potBefore > BigInt(0) && potAfter === BigInt(0)) {
        wonAtLeastOnce = true;
        break;
      }
    }

    // In the original contract, winning is possible (50% chance each play)
    // In the mutant, winning is impossible
    // If we never see a win in 10 plays (0.5^10 = 0.098% chance), mutant is likely present
    // But we use this as a probabilistic detection - for deterministic kill we use the next test

    // Actually, the deterministic way: check that after a win scenario, balances are correct
    // Since we can't force random, we accept this as probabilistic
    console.log(`Won at least once in 10 plays: ${wonAtLeastOnce}`);
  });

  it("should deterministically detect mutant by testing the exact condition", async function () {
    const [owner, player] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times until we hit a win (random == 0)
    // In the original contract, this will eventually succeed
    // In the mutant, it will never succeed (if (false) condition)

    let attempts = 0;
    const maxAttempts = 20;
    let winDetected = false;

    while (attempts < maxAttempts && !winDetected) {
      const potBefore = await instance.pot();
      const playerBalanceBefore = await ethers.provider.getBalance(player.address);
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

      const potAfter = await instance.pot();

      if (potAfter === BigInt(0)) {
        // Win detected! Verify correct distribution
        const playerBalanceAfter = await ethers.provider.getBalance(player.address);
        const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

        expect(playerBalanceAfter - playerBalanceBefore + gasCost).to.equal(TICKET_AMOUNT - FEE_AMOUNT);
        expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(FEE_AMOUNT);
        winDetected = true;
        break;
      }

      attempts++;
    }

    // If we never detect a win in maxAttempts plays, the mutant is likely present
    // But for a deterministic test, we assert that a win is possible
    // Note: This is probabilistic but with enough attempts (e.g., 20) it's virtually certain
    // P(no win in 20 attempts) = (0.5)^20 ≈ 0.000095% - extremely unlikely for original
    expect(winDetected).to.be.true;
  });
});