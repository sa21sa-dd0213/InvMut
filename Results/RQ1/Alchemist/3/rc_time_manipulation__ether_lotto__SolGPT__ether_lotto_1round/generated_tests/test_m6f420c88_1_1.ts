import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m6f420c88 test", function () {
  it("should detect mutant by verifying winner receives pot - FEE_AMOUNT", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Record balances before playing
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    const bankBalanceBefore = await ethers.provider.getBalance(owner.address);

    // Player plays the game
    await instance.connect(player).play({ value: TICKET_AMOUNT });

    // Record balances after playing
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    const bankBalanceAfter = await ethers.provider.getBalance(owner.address);

    // Calculate expected transfers
    // In the original: winner gets pot - FEE_AMOUNT (9 ether), bank gets FEE_AMOUNT (1 ether)
    const expectedPlayerGain = TICKET_AMOUNT - FEE_AMOUNT; // 9 ether
    const expectedBankGain = FEE_AMOUNT; // 1 ether

    // Check player received exactly pot - FEE_AMOUNT (not pot + FEE_AMOUNT)
    expect(playerBalanceAfter - playerBalanceBefore).to.equal(expectedPlayerGain);
    
    // Check bank received exactly FEE_AMOUNT
    expect(bankBalanceAfter - bankBalanceBefore).to.equal(expectedBankGain);

    // Verify pot is reset to 0 after the win
    const potAfter = await instance.pot();
    expect(potAfter).to.equal(0);
  });
});