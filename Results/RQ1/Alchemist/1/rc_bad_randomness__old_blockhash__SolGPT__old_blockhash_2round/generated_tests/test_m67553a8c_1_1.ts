import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test - m67553a8c", function () {
  it("should kill mutant by settling before target block and expecting revert in original but success in mutant", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy with 1 ether as required by constructor
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Lock in a guess that is NOT bytes32(0)
    const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("wrong guess"));
    const lockTx = await instance.connect(attacker).lockInGuess(fakeHash, {
      value: ethers.parseEther("1")
    });
    await lockTx.wait();
    
    // Settle immediately (current block number is still the target block + 1 or less)
    // In the original: require(block.number > guesses[msg.sender].block) would fail
    // because block.number is NOT greater than the target block yet
    // In the mutant: require(block.number < guesses[msg.sender].block) would PASS
    // because block.number is less than the target block (target is in the future)
    
    // If the mutant is present, settle will not revert and will compare fakeHash against
    // blockhash(futureBlock) which returns bytes32(0) - so guess != answer, no transfer
    // But the key is: in the original this would REVERT, in mutant it does NOT revert
    
    // So we expect the mutant to NOT revert, while original would revert
    // We can detect this by checking that settle does NOT revert
    const settleTx = await instance.connect(attacker).settle();
    await expect(settleTx).to.not.be.reverted;
    
    // Additionally, since the guess doesn't match bytes32(0), no transfer happens
    // But the function completes without revert - this kills the mutant because
    // the original would have reverted at the require statement
  });
});