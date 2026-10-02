import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should detect mutant m1b46e310 by verifying correct fee deduction", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n;
    const FEE_AMOUNT = 1n;

    // Player buys a ticket
    const playTx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await playTx.wait();

    // Get the pot after the play - if random == 0, pot is reset; if random == 1, pot remains
    const potAfterPlay = await instance.pot();

    // We need to force the random == 0 branch to test the transfer amount
    // Since block.timestamp and block.difficulty are deterministic in tests,
    // we can try multiple blocks until we get random == 0
    let foundZero = false;
    let playerBalanceAfter = 0n;
    let bankBalanceAfter = 0n;
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);
    const initialBankBalance = await ethers.provider.getBalance(owner.address);

    for (let i = 0; i < 20; i++) {
      // Mine a new block to change block.timestamp and block.difficulty
      await ethers.provider.send("evm_mine", []);
      
      const newPlayTx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await newPlayTx.wait();

      const potAfterNewPlay = await instance.pot();
      
      // If pot is 0, it means random == 0 and funds were transferred
      if (potAfterNewPlay === 0n) {
        foundZero = true;
        playerBalanceAfter = await ethers.provider.getBalance(player.address);
        bankBalanceAfter = await ethers.provider.getBalance(owner.address);
        break;
      }
    }

    if (foundZero) {
      // Calculate expected balances with original formula (pot - fee)
      const expectedPlayerGain = TICKET_AMOUNT - FEE_AMOUNT; // 9 wei
      const expectedBankGain = FEE_AMOUNT; // 1 wei
      
      // In the mutant, player would get pot / 1 = 10 wei and bank gets nothing
      // Verify player got exactly 9 wei (not 10 wei)
      const playerGain = playerBalanceAfter - initialPlayerBalance;
      const bankGain = bankBalanceAfter - initialBankBalance;

      expect(playerGain).to.equal(expectedPlayerGain);
      expect(bankGain).to.equal(expectedBankGain);
    } else {
      // If we couldn't trigger random == 0, the test is inconclusive
      // In practice, with enough blocks we should hit it
      throw new Error("Could not trigger random == 0 branch after 20 attempts");
    }
  });
});