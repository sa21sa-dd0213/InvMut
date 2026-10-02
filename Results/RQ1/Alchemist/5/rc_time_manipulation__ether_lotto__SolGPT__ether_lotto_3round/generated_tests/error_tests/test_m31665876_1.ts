import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - sha256 vs keccak256", function () {
  it("should detect mutant by comparing hash output under identical block conditions", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Capture block state before first play
    const blockBefore1 = await ethers.provider.getBlock("latest");
    const timestamp1 = blockBefore1!.timestamp;
    const difficulty1 = blockBefore1!.difficulty;

    // Compute expected original hash (keccak256) result
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [timestamp1, difficulty1]
    );
    const keccakHash = ethers.keccak256(encoded);
    const keccakRandom = BigInt(keccakHash) % 2n;

    // Play first game
    const tx1 = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx1.wait();

    // Capture block state before second play (should be same block conditions if we mine quickly)
    const blockBefore2 = await ethers.provider.getBlock("latest");
    const timestamp2 = blockBefore2!.timestamp;
    const difficulty2 = blockBefore2!.difficulty;

    // Compute expected original hash for second block
    const encoded2 = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [timestamp2, difficulty2]
    );
    const keccakHash2 = ethers.keccak256(encoded2);
    const keccakRandom2 = BigInt(keccakHash2) % 2n;

    // Determine expected pot distribution for original contract
    const potBefore2 = await instance.pot();
    let expectedPlayerBalanceChange: bigint;
    let expectedBankBalanceChange: bigint;

    if (keccakRandom2 === 0n) {
      // Player wins: player gets pot - fee, bank gets fee
      expectedPlayerBalanceChange = potBefore2 + TICKET_AMOUNT - FEE_AMOUNT;
      expectedBankBalanceChange = FEE_AMOUNT;
    } else {
      // Bank wins: player loses ticket amount, bank gets all
      expectedPlayerBalanceChange = 0n;
      expectedBankBalanceChange = TICKET_AMOUNT;
    }

    // Get balances before second play
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    const bankBalanceBefore = await ethers.provider.getBalance(owner.address);

    // Play second game
    const tx2 = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx2.wait();

    // Get balances after second play
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    const bankBalanceAfter = await ethers.provider.getBalance(owner.address);

    const actualPlayerChange = playerBalanceAfter - playerBalanceBefore;
    const actualBankChange = bankBalanceAfter - bankBalanceBefore;

    // The mutant (using sha256) will produce different hash values, thus different pot distribution
    // If the contract uses keccak256 (original), these assertions pass
    // If the contract uses sha256 (mutant), the actual changes will differ from expected keccak-based predictions
    expect(actualPlayerChange).to.equal(expectedPlayerBalanceChange);
    expect(actualBankChange).to.equal(expectedBankBalanceChange);
  });
});