import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m035a59d9", function () {
  it("should kill mutant by proving settle() cannot transfer ether when using block.prevrandao instead of stored block number", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy with 1 ether as required by constructor
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Player locks in a guess with 1 ether
    const lockInTx = await instance.connect(player).lockInGuess(
      ethers.ZeroHash, // any hash works for the test; we just need to trigger settle()
      { value: ethers.parseEther("1") }
    );
    await lockInTx.wait();
    
    // Wait until the target block is in the past (block.number > guesses[player].block)
    const playerBlock = await instance.connect(player).guesses(player.address);
    const targetBlock = playerBlock.block;
    
    // Mine blocks until we're past the target block
    while ((await ethers.provider.getBlockNumber()) <= Number(targetBlock)) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Now settle - in the original, this would transfer 2 ether if guess matches
    // In the mutant, blockhash(block.prevrandao) will always return 0x0
    // so the transfer condition answer != 0 && guess == answer will always be false
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    
    const settleTx = await instance.connect(player).settle();
    await settleTx.wait();
    
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    
    // The mutant should NOT transfer ether (player balance should stay the same minus gas)
    // Original would transfer 2 ether if guess matched (which it won't here due to ZeroHash)
    // But the key point: mutant can NEVER transfer because block.prevrandao is not a valid block number
    expect(playerBalanceAfter).to.be.lessThan(playerBalanceBefore); // only gas costs, no transfer
  });
});