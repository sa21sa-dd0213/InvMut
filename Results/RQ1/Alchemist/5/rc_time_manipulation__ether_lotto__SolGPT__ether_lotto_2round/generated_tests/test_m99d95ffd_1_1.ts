import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m99d95ffd", function () {
  it("should detect mutant by verifying pot is never reset after multiple plays", async function () {
    const [owner, player1, player2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play 20 times from different addresses to trigger winning condition
    for (let i = 0; i < 20; i++) {
      const player = i % 2 === 0 ? player1 : player2;
      await instance.connect(player).play({ value: TICKET_AMOUNT });
    }

    // On the original, pot should be 0 after a win occurred
    // On the mutant (division instead of modulo), pot keeps accumulating
    const potAfterPlays = await instance.pot();

    // The mutant will never reset pot to 0, so it will be greater than 0
    expect(potAfterPlays).to.equal(0);
  });
});