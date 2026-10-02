import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m6f420c88 detection", function () {
  it("should revert when winner receives more than pot balance due to + instead of -", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play once to set up initial state
    await instance.connect(player).play({ value: TICKET_AMOUNT });

    // Get the pot after first play (should be 0 after win)
    const potAfterFirstPlay = await instance.pot();
    expect(potAfterFirstPlay).to.equal(0);

    // Second play: player sends 10 wei, pot becomes 10, then bank gets 1
    // Original: winner gets pot - 1 = 9 (succeeds)
    // Mutant: winner gets pot + 1 = 11 (fails because only 9 remain after bank transfer)
    const tx = instance.connect(player).play({ value: TICKET_AMOUNT });

    // The mutant should revert due to insufficient balance when trying to send pot + fee
    await expect(tx).to.be.reverted;
  });
});