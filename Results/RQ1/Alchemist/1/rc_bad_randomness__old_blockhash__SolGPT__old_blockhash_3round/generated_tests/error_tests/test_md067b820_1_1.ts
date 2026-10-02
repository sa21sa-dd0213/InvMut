import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test (md067b820)", function () {
  it("should kill the mutant by submitting a guess larger than the actual block hash and verifying no reward", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Attacker locks in a guess with 1 ether
    // We use bytes32 max value (all F's) to ensure it's >= any real blockhash
    const maxBytes32 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    await instance.connect(attacker).lockInGuess(maxBytes32, { value: ethers.parseEther("1") });

    // Get the target block number from the contract
    const guessData = await instance.guesses(attacker.address);
    const targetBlock = guessData.block;

    // Mine blocks to pass the target block
    const currentBlock = await ethers.provider.getBlockNumber();
    if (currentBlock <= targetBlock) {
      const blocksToMine = targetBlock - currentBlock + 1;
      for (let i = 0; i < blocksToMine; i++) {
        await ethers.provider.send("evm_mine", []);
      }
    }

    // Now settle - attacker's guess (max bytes32) should be >= actual blockhash
    // In original, this would revert or not transfer because !=
    // In mutant, this would succeed and transfer 2 ether

    // Get attacker balance before
    const balanceBefore = await ethers.provider.getBalance(attacker.address);

    // Call settle
    const tx = await instance.connect(attacker).settle();
    const receipt = await tx.wait();

    // Get attacker balance after
    const balanceAfter = await ethers.provider.getBalance(attacker.address);

    // In original contract, no transfer happens (guess != actual hash)
    // In mutant, transfer of 2 ether would happen (guess >= actual hash)
    // So we assert balance did NOT increase by 2 ether (minus gas)
    const balanceDiff = balanceAfter - balanceBefore;

    // The mutant would transfer 2 ether, so balanceDiff would be ~2 ether
    // The original does NOT transfer, so balanceDiff would be negative (gas cost only)
    expect(balanceDiff).to.be.lessThan(ethers.parseEther("1"));
    // If the mutant transfers, balanceDiff would be positive and large (~2 ether)
  });
});