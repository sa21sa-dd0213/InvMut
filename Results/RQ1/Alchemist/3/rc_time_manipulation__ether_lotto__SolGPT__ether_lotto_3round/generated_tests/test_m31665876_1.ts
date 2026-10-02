import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EtherLotto mutant kill test - m31665876 (sha256 instead of keccak256)", function () {
  it("should kill the mutant by detecting different random outcome from sha256 vs keccak256", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Get initial bank balance
    const initialBankBalance = await ethers.provider.getBalance(owner.address);
    
    // Play once - this will use the mutated sha256 hash
    await instance.connect(player).play({ value: TICKET_AMOUNT });
    
    // Get final bank balance
    const finalBankBalance = await ethers.provider.getBalance(owner.address);
    
    // If random == 0: bank gets FEE_AMOUNT (1 wei), player gets pot - FEE_AMOUNT (9 wei)
    // If random == 1: bank gets nothing, player gets nothing (pot stays)
    // With keccak256, the outcome is deterministic for given block timestamp/difficulty
    // With sha256, the outcome will differ for the same inputs
    
    // Calculate expected bank gain for original keccak256 behavior
    // We need to determine what keccak256 would have returned for this specific block
    const block = await ethers.provider.getBlock("latest");
    const expectedHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [block.timestamp, block.difficulty]
      )
    );
    const expectedRandom = BigInt(expectedHash) % 2n;
    
    let expectedBankGain: bigint;
    if (expectedRandom === 0n) {
      expectedBankGain = FEE_AMOUNT;
    } else {
      expectedBankGain = 0n;
    }
    
    // Actual bank gain from the mutant (using sha256)
    const actualBankGain = finalBankBalance - initialBankBalance;
    
    // With sha256, the hash output differs from keccak256 for the same inputs
    // So the actual random outcome should be different from the expected one
    // This means the actual bank gain should NOT match the expected bank gain
    expect(actualBankGain).to.not.equal(expectedBankGain);
  });
});