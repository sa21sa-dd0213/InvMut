import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant ma84d0ec9 detection", function () {
  it("should detect mutant by verifying pot resets only when random == 0 (not always)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play once - if random != 0 (player loses), pot should become 10 ether
    await instance.connect(player).play({ value: TICKET_AMOUNT });
    let potAfterFirstPlay = await instance.pot();

    // Play again without reset - if player loses again, pot should increase to 20 ether
    // But if mutant is present (always true branch), pot will be 0 after every play
    await instance.connect(player).play({ value: TICKET_AMOUNT });
    let potAfterSecondPlay = await instance.pot();

    // In the original, both plays could be losses → pot = 20 ether
    // In the mutant, both plays reset pot to 0 → pot = 0 ether
    // If pot is 0, the mutant is detected (it should have been >= 10)
    expect(potAfterSecondPlay).to.be.gte(TICKET_AMOUNT);
  });
});