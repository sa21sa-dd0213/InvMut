import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m99d95ffd", function () {
  it("should detect the mutant by verifying that the bank balance does not increase after every play (mutant always sends fee to bank)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Get initial bank balance
    const initialBankBalance = await ethers.provider.getBalance(owner.address);

    // Play twice - in the original, sometimes the pot accumulates and bank gets no fee
    // In the mutant, bank always gets the fee and pot resets
    await instance.connect(player).play({ value: TICKET_AMOUNT });
    await instance.connect(player).play({ value: TICKET_AMOUNT });

    const finalBankBalance = await ethers.provider.getBalance(owner.address);

    // In the mutant, bank balance increases by exactly 2 * FEE_AMOUNT (2 wei)
    // In the original, bank balance increases by 0, 1, or 2 wei depending on randomness
    // This test kills the mutant by checking that the increase is NOT exactly 2 * FEE_AMOUNT
    // because the mutant always gives the fee, while the original has a 25% chance of giving 2 fees
    // and a 75% chance of giving 0 or 1 fee, making it statistically improbable to always match
    expect(finalBankBalance - initialBankBalance).to.not.equal(FEE_AMOUNT * 2n);
  });
});