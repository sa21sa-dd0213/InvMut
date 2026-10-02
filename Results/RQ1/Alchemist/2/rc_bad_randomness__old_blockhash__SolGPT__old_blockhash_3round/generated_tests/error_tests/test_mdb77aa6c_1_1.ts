import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test - kill mdb77aa6c", function () {
  it("should transfer 2 ether when correct block hash is guessed, but mutant will fail", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Strategy: lock in a guess of keccak256(abi.encodePacked(bytes32(0)))
    // Wait 256+ blocks, then settle. Original will compute answer using
    // blockhash which returns 0, so answer = keccak256(0) = our guess.
    // Mutant uses block.prevrandao which is not 0, so answer differs.
    const zeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const expectedAnswer = ethers.keccak256(ethers.concat(["0x", zeroHash.slice(2)]));

    // Lock in the guess of keccak256(0)
    await instance.connect(addr1).lockInGuess(expectedAnswer, { value: ethers.parseEther("1") });

    // Get the target block number
    const targetBlockNum = await ethers.provider.getBlockNumber();

    // Mine 257 blocks to make blockhash return 0
    for (let i = 0; i < 257; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    const balanceBeforeSettle = await ethers.provider.getBalance(addr1.address);

    // Settle - original should pay 2 ether, mutant should not
    await instance.connect(addr1).settle();

    const balanceAfterSettle = await ethers.provider.getBalance(addr1.address);

    // In the original contract, this would increase by 2 ether
    // In the mutant, it stays the same (minus gas)
    // This test kills the mutant because:
    // - Original: balanceAfterSettle - balanceBeforeSettle = 2 ether (approx, minus gas)
    // - Mutant: balanceAfterSettle - balanceBeforeSettle ≈ 0 (minus gas)
    // We assert that the balance increased (this will fail on mutant)
    expect(balanceAfterSettle).to.be.gt(balanceBeforeSettle);
  });
});