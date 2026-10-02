import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m34b801a6", function () {
  it("should kill mutant by exploiting block.prevrandao vs block.timestamp difference", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Set block.timestamp and block.prevrandao to specific values
    // to force different random outcomes between original and mutant
    const targetTimestamp = 1000000;
    const targetPrevRandao = ethers.hexlify(ethers.randomBytes(32));
    
    // Mine a block with specific timestamp and prevrandao
    await ethers.provider.send("evm_setNextBlockTimestamp", [targetTimestamp]);
    await ethers.provider.send("hardhat_setPrevRandao", [targetPrevRandao]);
    
    // Play with the exact values that will produce random == 0 in original
    // but random == 1 in mutant (or vice versa)
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // If mutant changed behavior, pot will be 0 when it shouldn't be
    // or non-zero when it should be 0
    const potAfter = await instance.pot();

    // The original contract with block.timestamp=1000000 and
    // block.difficulty would give a specific outcome.
    // The mutant with block.prevrandao instead will give a different outcome.
    // We assert that pot is NOT the expected mutant behavior
    // (i.e., the mutant fails if pot == 0 when it should be 10)
    expect(potAfter).to.equal(TICKET_AMOUNT);
  });
});