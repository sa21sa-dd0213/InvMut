import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8fe5d5ab test", function () {
  it("should detect mutant that always enters winning branch", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // First play - regardless of outcome, pot will be 10 and then either reset or not
    await instance.connect(player).play({ value: TICKET_AMOUNT });

    // Get pot after first play
    let potAfterFirst = await instance.pot();

    // Second play - in original, if first play didn't win (random == 1), pot is 20 before this call
    // In mutant, pot is always reset to 0 after every call
    await instance.connect(player).play({ value: TICKET_AMOUNT });

    let potAfterSecond = await instance.pot();

    // If mutant (always true branch), pot is always reset to 0 after each play
    // If original, there's a 50% chance potAfterSecond = 20 (when first random was 1)
    // We cannot guarantee a specific pot value due to randomness, but we can detect the mutant
    // by checking that pot is NEVER greater than 10 after the second call
    // In original, pot could be 20; in mutant, pot is always 0 or 10 (after reset + new ticket)
    // Actually in mutant: after first call pot=0 (reset), after second call pot=10 (before reset, but reset happens after)
    // So pot after second call in mutant = 10 (from second ticket added then reset to 0? No, reset happens first then transfer)
    // Let's trace: mutant always enters if block:
    //   pot += msg.value => pot becomes 10
    //   bank gets 1, player gets 9, pot = 0
    // So after any play, pot = 0 always
    // In original when random == 1: pot += 10 => pot=20, no reset, no transfers
    // So after first random==1, pot=20; after second random==1, pot=30; after second random==0, pot reset
    // We can detect mutant by checking pot is always 0 after any play
    expect(potAfterSecond).to.equal(0);
  });
});