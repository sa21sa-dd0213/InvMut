import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m51c35cde", function () {
  it("should detect mutant where if (random == 0) is replaced with if (false)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Get initial balances
    const initialBankBalance = await ethers.provider.getBalance(owner.address);
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);

    // Player plays the lottery
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // Get final balances
    const finalBankBalance = await ethers.provider.getBalance(owner.address);
    const finalPlayerBalance = await ethers.provider.getBalance(player.address);

    // Calculate expected transfers for the original contract:
    // Bank should receive FEE_AMOUNT (1 wei) when random == 0
    // Player should receive (TICKET_AMOUNT - FEE_AMOUNT) = 9 wei when random == 0
    const bankDelta = finalBankBalance - initialBankBalance;
    const playerDelta = finalPlayerBalance - initialPlayerBalance;
    const playerPaid = TICKET_AMOUNT;
    const playerReceived = TICKET_AMOUNT - FEE_AMOUNT;

    // In the original contract, either the if-block executes (random==0) or it doesn't (random==1)
    // If the if-block executes: bankDelta = FEE_AMOUNT, playerDelta = playerReceived - playerPaid = -FEE_AMOUNT
    // If the if-block doesn't execute: bankDelta = 0, playerDelta = -playerPaid
    // The mutant ALWAYS behaves as if the if-block doesn't execute (random==1 case)
    // So we check that the result is consistent with the mutant's behavior (no transfer to bank)
    // The mutant will have bankDelta = 0 and playerDelta = -playerPaid
    // This test will PASS on the mutant and FAIL on the original (because sometimes the if-block executes)
    // To kill the mutant, we need a test that fails on the mutant but passes on the original
    // Since we cannot control randomness, we test both possibilities:
    // The original will pass either assertion below (one will pass, one will fail randomly)
    // The mutant will ALWAYS have bankDelta = 0 and playerDelta = -playerPaid
    // We want the test to fail on the mutant, so we assert that bankDelta > 0 OR playerDelta > -playerPaid
    // But that's tricky with randomness. Instead, let's run multiple times to cover both cases:
    // Actually, the simplest way: run the test 10 times and check that at least once the if-block executed
    // But that's not deterministic. Let's use a different approach:
    // We know the original has 50% chance to execute the if-block. 
    // We'll run the test many times and expect to see both behaviors.
    // However, for a single deterministic test, we can assert that the pot was reset after winning:
    // In the mutant, pot never resets. So we can check pot accumulation. 

    // Play multiple times and check that pot keeps growing in the mutant
    // Play 5 times - in the mutant, pot should be 5 * TICKET_AMOUNT
    // In the original, pot should sometimes reset
    for (let i = 0; i < 4; i++) {
      await instance.connect(player).play({ value: TICKET_AMOUNT });
    }

    const potAfter5Plays = await instance.pot();
    // In the mutant, pot will always be 5 * TICKET_AMOUNT (50 wei) because if-block never executes
    // In the original, pot will vary but cannot be 50 wei unless all 5 plays resulted in random==1 (unlikely)
    // Assert that pot is NOT 50 wei - this will fail on the mutant (killing it) and pass on the original
    expect(potAfter5Plays).to.not.equal(ethers.parseEther("50"));
  });
});