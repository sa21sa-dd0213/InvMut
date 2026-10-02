import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8fe5d5ab test", function () {
  it("should detect that pot is always reset when condition is always true", async function () {
    const [owner, player1, player2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = ethers.parseEther("10");
    const feeAmount = ethers.parseEther("1");

    // First play: player1 sends 10 ether
    await player1.sendTransaction({
      to: await instance.getAddress(),
      value: ticketAmount
    });

    // After first play, pot should be 0 (because condition is always true, pot is reset)
    let potAfterFirst = await instance.pot();
    expect(potAfterFirst).to.equal(0);

    // Second play: player2 sends 10 ether
    await player2.sendTransaction({
      to: await instance.getAddress(),
      value: ticketAmount
    });

    // After second play, pot should also be 0 (always reset)
    let potAfterSecond = await instance.pot();
    expect(potAfterSecond).to.equal(0);

    // Verify that bank balance increased by fee each time (2 fees total)
    const bankBalance = await ethers.provider.getBalance(await instance.bank());
    expect(bankBalance).to.equal(ethers.parseEther("2"));
  });
});