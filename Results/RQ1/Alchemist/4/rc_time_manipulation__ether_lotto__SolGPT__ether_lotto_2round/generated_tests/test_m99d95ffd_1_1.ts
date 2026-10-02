import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - m99d95ffd", function () {
  it("should detect that division instead of modulo makes winning impossible", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times - with the original modulo, player would win sometimes
    // With the mutant division, player should never win
    let playerWon = false;
    for (let i = 0; i < 20; i++) {
      const playerBalanceBefore = await ethers.provider.getBalance(player.address);
      const potBefore = await instance.pot();

      await instance.connect(player).play({ value: TICKET_AMOUNT });

      const playerBalanceAfter = await ethers.provider.getBalance(player.address);
      const potAfter = await instance.pot();

      // If player won: pot becomes 0, player receives potBefore - FEE_AMOUNT
      if (potAfter === BigInt(0)) {
        playerWon = true;
        // Verify player got the pot minus fee
        const expectedGain = potBefore - FEE_AMOUNT;
        const actualGain = playerBalanceAfter - playerBalanceBefore + TICKET_AMOUNT;
        expect(actualGain).to.equal(expectedGain);
        break;
      }
    }

    // The mutant should never allow a win - assert that player never won
    expect(playerWon).to.be.false;
  });
});