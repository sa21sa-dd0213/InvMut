import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test (m60b26066)", function () {
  it("should detect mutant that replaces % with / by verifying a win is possible", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play the lottery multiple times to increase chance of triggering win condition
    for (let i = 0; i < 20; i++) {
      await instance.connect(player).play({ value: TICKET_AMOUNT });
    }

    // Check contract balance: original (modulo) will have pot = 0 after wins,
    // mutant (division) will have pot accumulate because no win ever resets it
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(0); // In original, pot is always reset after win
    // But in mutant, pot keeps accumulating because no win ever resets it
    // So if pot != 0 after many plays, it's the mutant
  });
});