import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - m51c35cde", function () {
  it("should detect mutant where if(false) prevents any win from happening", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = ethers.parseEther("10");
    const feeAmount = ethers.parseEther("1");

    // Player plays once
    const playTx = await instance.connect(player).play({ value: ticketAmount });
    await playTx.wait();

    // Check pot after play: in original, if player won, pot would be 0; if player lost, pot = 10
    // But in mutant, player can NEVER win, so pot must always be ticketAmount (10)
    const potAfterFirstPlay = await instance.pot();
    expect(potAfterFirstPlay).to.equal(ticketAmount);

    // Player plays a second time to increase pot
    const playTx2 = await instance.connect(player).play({ value: ticketAmount });
    await playTx2.wait();

    // Pot should now be 2 * ticketAmount because no win ever occurs
    const potAfterSecondPlay = await instance.pot();
    expect(potAfterSecondPlay).to.equal(ticketAmount * 2n);

    // Bank should never have received any fees since no win condition was ever triggered
    const bankBalance = await ethers.provider.getBalance(instance.getAddress());
    // Bank only holds the contract's balance (pot), no fees have been transferred out
    expect(bankBalance).to.equal(ticketAmount * 2n);
  });
});