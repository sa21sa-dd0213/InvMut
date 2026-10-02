import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m58a63c87 detection", function () {
  it("should detect mutant by verifying block.difficulty-based randomness behavior", async function () {
    const [owner, player1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Get the current block to know its difficulty
    const blockBefore = await ethers.provider.getBlock("latest");
    const difficulty = blockBefore!.difficulty;

    // Calculate what the original contract would compute
    const expectedRandom = BigInt(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256"],
          [blockBefore!.timestamp, difficulty]
        )
      )
    ) % 2n;

    // Player plays the lottery
    await expect(
      player1.sendTransaction({
        to: await instance.getAddress(),
        value: TICKET_AMOUNT,
      })
    ).to.not.be.reverted;

    // Check the pot after the play
    const potAfter = await instance.pot();

    // If random was 0 (original logic), pot should be 0 (winner takes all minus fee)
    // If random was 1, pot should be TICKET_AMOUNT (no winner, pot accumulates)
    if (expectedRandom === 0n) {
      expect(potAfter).to.equal(0n);
    } else {
      expect(potAfter).to.equal(TICKET_AMOUNT);
    }

    // Now verify the bank balance changed correctly based on original logic
    const bankBalance = await ethers.provider.getBalance(await instance.bank());
    if (expectedRandom === 0n) {
      // Bank should have received the fee
      expect(bankBalance).to.equal(FEE_AMOUNT);
    } else {
      // Bank should have received nothing (no transfer)
      expect(bankBalance).to.equal(0n);
    }
  });
});