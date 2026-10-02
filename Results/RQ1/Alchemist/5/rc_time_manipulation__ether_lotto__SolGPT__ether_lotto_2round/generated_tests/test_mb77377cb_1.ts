import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - mb77377cb", function () {
  it("should detect inverted payout condition by verifying payout on random==0 only", async function () {
    const [owner, player] = await ethers.getSigners();
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balances
    const initialBankBalance = await ethers.provider.getBalance(owner.address);
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);

    // Play the lottery - we need to force a known outcome
    // Since random = uint(keccak256(...)) % 2, we can try different block parameters
    // We'll play multiple times and look for a win (random==0) and a loss (random==1)
    
    let foundWin = false;
    let foundLoss = false;
    let winTx;
    let lossTx;
    
    // Try up to 20 times to find both outcomes
    for (let i = 0; i < 20; i++) {
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      const receipt = await tx.wait();
      
      // Check if the player received the pot (win condition)
      const potValue = TICKET_AMOUNT; // pot was 0 initially, now it's TICKET_AMOUNT after first play
      const playerExpectedPayout = potValue - FEE_AMOUNT;
      
      // A win would transfer playerExpectedPayout to player
      // A loss would transfer nothing to player
      
      if (!foundWin) {
        const playerBalanceAfter = await ethers.provider.getBalance(player.address);
        const playerChange = playerBalanceAfter - initialPlayerBalance;
        // If player won, they should have gotten pot - fee (but they paid 10, so net change is -fee)
        if (playerChange >= playerExpectedPayout - TICKET_AMOUNT) {
          foundWin = true;
          winTx = tx;
        } else {
          foundLoss = true;
          lossTx = tx;
        }
      }
      
      if (foundWin && foundLoss) break;
    }
    
    // Verify both outcomes exist (in original, win = random==0, loss = random!=0)
    expect(foundWin).to.be.true;
    expect(foundLoss).to.be.true;
    
    // Now verify that the payout only happens when random==0 (not random!=0)
    // Re-deploy to test a specific scenario
    const instance2 = await Factory.deploy();
    await instance2.waitForDeployment();
    
    // Mine a block with known timestamp to control randomness
    await ethers.provider.send("evm_setNextBlockTimestamp", [1000000]);
    await ethers.provider.send("evm_mine");
    
    // Play with specific block parameters to force random==0
    // We can't directly control keccak256 output, but we can verify the mutant behavior
    // by checking that the bank receives fee only on wins (random==0) in original
    
    const bankBalanceBefore = await ethers.provider.getBalance(owner.address);
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    
    const playTx = await instance2.connect(player).play({ value: TICKET_AMOUNT });
    const playReceipt = await playTx.wait();
    
    const bankBalanceAfter = await ethers.provider.getBalance(owner.address);
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    
    const bankChange = bankBalanceAfter - bankBalanceBefore;
    const playerChange = playerBalanceAfter - playerBalanceBefore;
    
    // In original: if random==0, bank gets FEE, player gets pot-FEE (net: -FEE)
    // In mutant: if random!=0, bank gets FEE, player gets pot-FEE
    
    // The mutant flips the condition. We can detect this by checking:
    // If bank receives fee AND player receives payout, it could be either original or mutant
    // But we need to verify the exact opposite behavior
    
    // Actually, the simplest test: play twice with same block parameters to get same random
    // If first play gave a win (player got payout), second play should give a loss (player loses 10)
    // In mutant, the opposite would happen
    
    const instance3 = await Factory.deploy();
    await instance3.waitForDeployment();
    
    // Play first time
    await instance3.connect(player).play({ value: TICKET_AMOUNT });
    const potAfterFirst = await instance3.pot();
    
    // Play second time with same block conditions
    await ethers.provider.send("evm_setNextBlockTimestamp", [2000000]);
    await ethers.provider.send("evm_mine");
    
    const balanceBeforeSecond = await ethers.provider.getBalance(player.address);
    await instance3.connect(player).play({ value: TICKET_AMOUNT });
    const balanceAfterSecond = await ethers.provider.getBalance(player.address);
    
    const playerNetChange = balanceAfterSecond - balanceBeforeSecond;
    
    // If random==0 (original win): player gets pot (10+10-1=19) minus their 10 bet = +9 net
    // If random!=0 (original loss): player loses their 10 bet = -10 net
    
    // In mutant, the opposite happens:
    // If random!=0 (mutant win): player gets pot (10+10-1=19) minus their 10 bet = +9 net  
    // If random==0 (mutant loss): player loses their 10 bet = -10 net
    
    // We need to know what random was. Let's compute it:
    const block = await ethers.provider.getBlock("latest");
    const random = BigInt(ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "address"],
        [block.timestamp, block.prevrandao, player.address]
      )
    )) % 2n;
    
    if (random === 0n) {
      // Original: win => player gets +9 net
      // Mutant: loss => player gets -10 net
      expect(playerNetChange).to.equal(ethers.parseEther("9")); // original behavior
      // If mutant, this assertion would fail because player would lose 10
    } else {
      // Original: loss => player gets -10 net
      // Mutant: win => player gets +9 net
      expect(playerNetChange).to.equal(ethers.parseEther("-10")); // original behavior
      // If mutant, this assertion would fail because player would get +9
    }
  });
});