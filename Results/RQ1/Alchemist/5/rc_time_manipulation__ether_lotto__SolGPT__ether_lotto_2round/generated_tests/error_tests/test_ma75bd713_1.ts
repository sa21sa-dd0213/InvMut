import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should kill mutant ma75bd713 by detecting different random outcome using block.prevrandao vs block.timestamp", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Get initial balances
    const initialBankBalance = await ethers.provider.getBalance(owner.address);
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);

    // Record block values that will be used by the random function
    const block = await ethers.provider.getBlock("latest");
    const blockTimestamp = block.timestamp;
    const blockDifficulty = block.difficulty;
    const blockPrevRandao = block.prevrandao;

    // Calculate expected random outcome using block.timestamp (original contract)
    const expectedRandomOriginal = BigInt(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256", "address"],
          [blockTimestamp, blockDifficulty, player.address]
        )
      )
    ) % 2n;

    // Execute play transaction
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt = await tx.wait();

    // Get final balances
    const finalBankBalance = await ethers.provider.getBalance(owner.address);
    const finalPlayerBalance = await ethers.provider.getBalance(player.address);
    const finalPot = await instance.pot();

    if (expectedRandomOriginal === 0n) {
      // Original: player wins, bank gets fee, pot resets
      expect(finalPot).to.equal(0n);
      expect(finalBankBalance - initialBankBalance).to.equal(FEE_AMOUNT);
      expect(finalPlayerBalance - initialPlayerBalance).to.equal(
        TICKET_AMOUNT - FEE_AMOUNT
      );
    } else {
      // Original: player loses, pot accumulates
      expect(finalPot).to.equal(TICKET_AMOUNT);
      expect(finalBankBalance - initialBankBalance).to.equal(0n);
      expect(finalPlayerBalance - initialPlayerBalance).to.equal(-TICKET_AMOUNT);
    }

    // Now verify the mutant would have produced a different outcome
    // Calculate expected random outcome using block.prevrandao (mutant)
    const expectedRandomMutant = BigInt(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256", "address"],
          [blockPrevRandao, blockDifficulty, player.address]
        )
      )
    ) % 2n;

    // If the two random outcomes differ, the mutant is killed
    expect(expectedRandomOriginal).to.not.equal(expectedRandomMutant);
  });
});