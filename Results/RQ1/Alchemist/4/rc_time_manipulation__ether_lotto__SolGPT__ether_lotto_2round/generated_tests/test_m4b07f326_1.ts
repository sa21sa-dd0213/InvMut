import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m4b07f326 test", function () {
  it("should detect the keccak256 to sha256 mutation by replaying identical conditions", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Record initial state
    const initialBankBalance = await ethers.provider.getBalance(owner.address);
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);
    const initialPot = await instance.pot();

    // Mine a block to get deterministic block.timestamp and block.difficulty
    await ethers.provider.send("evm_mine", []);

    // Capture current block info before the call
    const blockBefore = await ethers.provider.getBlock("latest");
    
    // Execute play() with the exact parameters
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt = await tx.wait();

    // Get the actual block where the transaction was mined
    const txBlock = await ethers.provider.getBlock(receipt.blockNumber);
    
    // Recompute the original keccak256-based outcome
    const encodedData = ethers.solidityPacked(
      ["uint256", "uint256", "address"],
      [txBlock.timestamp, txBlock.difficulty, player.address]
    );
    const hash = ethers.keccak256(encodedData);
    const random = BigInt(hash) % 2n;
    
    // Expected pot after play based on original keccak256
    let expectedPot;
    if (random === 0n) {
      // Player wins: pot becomes 0, player gets pot - fee, bank gets fee
      expectedPot = 0n;
    } else {
      // Player loses: pot increases by ticket amount
      expectedPot = initialPot + TICKET_AMOUNT;
    }

    // Assert the pot matches the keccak256-based expectation
    // If the mutant uses sha256, the outcome will differ and this assertion will fail
    const actualPot = await instance.pot();
    expect(actualPot).to.equal(expectedPot);
  });
});