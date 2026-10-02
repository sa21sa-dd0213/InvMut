import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m60b26066", function () {
  it("should detect mutant where % is replaced with / by verifying pot is reset after multiple plays", async function () {
    const [owner, player1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times to increase chances of hitting random == 0
    for (let i = 0; i < 20; i++) {
      await instance.connect(player1).play({ value: TICKET_AMOUNT });
    }

    // Get current pot value
    const pot = await instance.pot();

    // In the original contract, pot should be 0 after at least one win in 20 attempts (99.9999% probability)
    // In the mutant, division by 2 always produces non-zero random, so pot will never be reset
    expect(pot).to.equal(0);
  });
});